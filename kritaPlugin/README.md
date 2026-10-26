# CM Export Character

A Krita Python extension that exports a character's body-part PNGs and calculated
pivot/connection metadata. Run it with **Tools > Scripts > CM Export Character**.
It exports the current in-memory artwork without modifying or saving the source
document.

## Install

1. In Krita, choose **Tools > Scripts > Import Python Plugin from File**.
2. Select `cmExportCharacter.zip` from this folder.
3. Enable the plugin if prompted, then restart Krita.
4. If necessary, open Krita's preferences (**Settings > Configure Krita**, or
   **Krita > Preferences** on macOS), select **Python Plugin Manager**, enable
   **CM Export Character**, and restart Krita again.

To update an installed copy, import the new ZIP, confirm overwriting the plugin,
and restart Krita. If the earlier **Hello Dummy** plugin is still installed,
disable it separately in Python Plugin Manager.

The plugin runs in Krita's embedded Python environment and uses its bundled
`krita` and `PyQt5` modules. Do not install these into the shell's Python.

## Prepare and Export

1. Open a character document and save it to establish its filename and output
   folder. The folder must be writable.
2. Create exactly one layer with each of these case-sensitive names:

   | Body layer | Pivot marker layer |
   | --- | --- |
   | head | headPivot |
   | leftArm | leftArmPivot |
   | rightArm | rightArmPivot |
   | leftLeg | leftLegPivot |
   | rightLeg | rightLegPivot |
   | torso | torsoPivot |

3. Position each pivot marker so the center of its content bounds marks the
   corresponding body part's pivot point. Layers may be nested inside groups;
   required names must be unique across the document.
4. Choose **Tools > Scripts > CM Export Character**. A message reports success
   or an error. Missing or duplicate layers stop the export before any files
   are written.

## Output

Files are written beside the source document. For `duchessTest.kra`, the output
is six PNGs named `duchessTest_head.png`, `duchessTest_leftArm.png`,
`duchessTest_rightArm.png`, `duchessTest_leftLeg.png`, `duchessTest_rightLeg.png`,
and `duchessTest_torso.png`, plus `duchessTest.md`.

PNGs are cropped to each body layer's content bounds, with transparency enabled.
Pivot marker layers are not exported. PNG options dialogs are suppressed using
temporary batch mode; other PNG options use Krita's defaults.

The Markdown file contains a heading using the document's filename stem and
`* key=value` entries, ordered head, left arm, right arm, left leg, right leg,
then torso:

- `<part>Image`: exported PNG filename without a path.
- `<part>Dimensions`: body layer width and height in pixels.
- `<part>Pivot`: pivot marker center relative to the body layer's top-left,
  rounded to the nearest integer (ties to even).
- `torso<Part>Connection`: each non-torso part's rounded pivot position expressed
  relative to the torso's top-left.

**Existing output files are overwritten without confirmation.** Each PNG is
verified as readable before replacing its destination. Metadata is written only
after all six PNGs succeed. If an export fails, previously completed PNGs remain;
the export is not an all-or-nothing transaction. Diagnostics go to console output.

## Develop with Scripter

All functions live in `cmExportCharacter/cmExportCharacter.py`. Copy the imports
and functions through the `if __name__ == "__main__":` block, stopping before
`class CMExportCharacterExtension`, into Krita's Scripter and run them. No manual
indentation changes or plugin reinstallation are needed for this workflow.

## Rebuild the Import Archive

Build a ZIP when ready to install a new plugin version, not for every source
change. From the repository root:

```sh
./kritaPlugin/package.sh
```

The script can run from any working directory and replaces the archive with a
fresh ZIP containing only the required plugin entries.

The desktop file and `cmExportCharacter` package must be at the ZIP root, not inside an
extra `kritaPlugin` folder. Include the explicit `cmExportCharacter/` directory entry:
Krita's importer requires it even when the files inside the folder are present.
Rebuilding the ZIP does not update an already installed
copy; import the updated archive and restart Krita.