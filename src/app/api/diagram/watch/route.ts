import { NextResponse } from "next/server";
import { readDiagramFile } from "@/lib/diagram-io";
import { layoutDiagram } from "@/lib/auto-layout";
import { subscribeToDiagramFile } from "@/lib/file-watcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const sendDiagram = async () => {
        if (closed) return;
        try {
          const diagram = await readDiagramFile();
          if (!diagram || closed) return;
          const laidOut = layoutDiagram(diagram);
          const payload = `data: ${JSON.stringify(laidOut)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          if (!closed) {
            controller.enqueue(
              encoder.encode(`event: error\ndata: "Failed to read diagram"\n\n`),
            );
          }
        }
      };

      void sendDiagram();

      const unsubscribe = subscribeToDiagramFile(() => {
        void sendDiagram();
      });

      const heartbeat = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }
      }, 30000);

      cleanup = () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
