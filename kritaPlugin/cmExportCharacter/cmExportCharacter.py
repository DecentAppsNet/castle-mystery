from pathlib import Path
from tempfile import TemporaryDirectory

from PyQt5.QtGui import QImage
from PyQt5.QtWidgets import QMessageBox
from krita import Extension, InfoObject, Krita


def _showMessage(text):
    window = Krita.instance().activeWindow()
    QMessageBox.information(
        window.qwindow() if window is not None else None,
        "CM Export Character",
        text,
    )


def _findLayers(node):
    layers = []
    for child in node.childNodes():
        if child.type().endswith("layer"):
            layers.append(child)
        layers.extend(_findLayers(child))
    return layers


def _saveLayer(layer, outputPath, document, configuration):
    application = Krita.instance()
    previousBatchMode = application.batchmode()
    application.setBatchmode(True)
    try:
        return layer.save(
            str(outputPath),
            document.xRes() / 72.0,
            document.yRes() / 72.0,
            configuration,
        )
    finally:
        application.setBatchmode(previousBatchMode)


def _exportCharacter(checked=False):
    document = Krita.instance().activeDocument()
    if document is None:
        _showMessage("Open a character document before exporting.")
        return

    bodyNames = ("head", "nearArm", "farArm", "leftLeg", "rightLeg", "torso")
    requiredNames = bodyNames + tuple(name + "Pivot" for name in bodyNames)
    layers = _findLayers(document.rootNode())
    trackedLayers = {}
    errors = []
    for name in requiredNames:
        matches = [layer for layer in layers if layer.name() == name]
        if not matches:
            errors.append(f"Missing layer: {name}")
        elif len(matches) > 1:
            errors.append(f"Multiple layers named: {name}")
        else:
            trackedLayers[name] = matches[0]
    if errors:
        _showMessage("Cannot export character:\n" + "\n".join(errors))
        return

    if not document.fileName():
        _showMessage("Save the document first so exports have a name and folder.")
        return
    documentPath = Path(document.fileName())
    configuration = InfoObject()
    configuration.setProperty("alpha", True)
    document.waitForDone()

    for name in bodyNames:
        layer = trackedLayers[name]
        outputPath = documentPath.with_name(f"{documentPath.stem}_{layer.name()}.png")
        try:
            with TemporaryDirectory(dir=str(documentPath.parent)) as temporaryFolder:
                temporaryPath = Path(temporaryFolder) / outputPath.name
                result = _saveLayer(layer, temporaryPath, document, configuration)
                diagnostic = (
                    f"Krita {Krita.instance().version()}: layer.save({str(temporaryPath)!r}) "
                    f"returned {result!r} (type: {type(result).__name__})"
                )
                print(diagnostic)
                if result is False or QImage(str(temporaryPath)).isNull():
                    _showMessage(
                        f"Failed to export {outputPath}.\n"
                        "Export stopped; any PNGs already exported remain in the folder."
                    )
                    return
                temporaryPath.replace(outputPath)
        except OSError as error:
            print(f"Failed to export {outputPath}: {error}")
            _showMessage(
                f"Failed to export {outputPath}.\n"
                "Export stopped; any PNGs already exported remain in the folder."
            )
            return

    metadataPath = documentPath.with_suffix(".md")
    lines = [f"# {documentPath.stem}"]
    pivotOffsets = {}
    for name in bodyNames:
        bounds = trackedLayers[name].bounds()
        pivotBounds = trackedLayers[name + "Pivot"].bounds()
        pivotX = round(pivotBounds.x() + pivotBounds.width() / 2 - bounds.x())
        pivotY = round(pivotBounds.y() + pivotBounds.height() / 2 - bounds.y())
        pivotOffsets[name] = (pivotX, pivotY)
        lines.extend(
            [
                f"* {name}Image={documentPath.stem}_{name}.png",
                f"* {name}Dimensions={bounds.width()},{bounds.height()}",
                f"* {name}Pivot={pivotX},{pivotY}",
            ]
        )

    torsoBounds = trackedLayers["torso"].bounds()
    for name in bodyNames:
        if name == "torso":
            continue
        bounds = trackedLayers[name].bounds()
        pivotX, pivotY = pivotOffsets[name]
        connectionX = pivotX + bounds.x() - torsoBounds.x()
        connectionY = pivotY + bounds.y() - torsoBounds.y()
        connectionName = name[0].upper() + name[1:]
        lines.append(f"* torso{connectionName}Connection={connectionX},{connectionY}")

    try:
        metadataPath.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except OSError as error:
        print(f"Failed to write {metadataPath}: {error}")
        _showMessage(f"PNGs exported, but failed to write {metadataPath}.")
        return

    _showMessage(
        f"Exported {len(bodyNames)} PNG files and {metadataPath.name} to:\n"
        f"{documentPath.parent}"
    )


if __name__ == "__main__":
    _exportCharacter()


class CMExportCharacterExtension(Extension):
    def setup(self):
        pass

    def createActions(self, window):
        action = window.createAction("cmExportCharacter", "CM Export Character", "tools/scripts")
        action.triggered.connect(_exportCharacter)