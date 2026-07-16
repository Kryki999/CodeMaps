import { NextResponse } from "next/server";
import path from "node:path";
import {
  inspectPickedProject,
  pickFolderNative,
} from "@/lib/pick-folder";
import { getProjectRootAbsolute } from "@/lib/codemaps-path";

/** Native folder dialog can wait on the user for a long time. */
export const maxDuration = 300;

export async function POST() {
  try {
    let initial: string | undefined;
    try {
      const current = await getProjectRootAbsolute();
      if (path.isAbsolute(current)) initial = current;
    } catch {
      // ignore — dialog still works without a start path
    }

    const picked = await pickFolderNative(initial);
    if (!picked) {
      return NextResponse.json({ cancelled: true });
    }

    const info = await inspectPickedProject(picked);
    return NextResponse.json({ cancelled: false, ...info });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się otworzyć wyboru folderu",
      },
      { status: 500 },
    );
  }
}
