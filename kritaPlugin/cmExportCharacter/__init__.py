from krita import Krita

from .cmExportCharacter import CMExportCharacterExtension


Krita.instance().addExtension(CMExportCharacterExtension(Krita.instance()))