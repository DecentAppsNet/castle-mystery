import CharacterAnatomyContext from './CharacterAnatomyContext';
import SpriteOverride from './SpriteOverride';

type AnatomyHandler = (context:CharacterAnatomyContext, gameTime:number, metaTime:number) => SpriteOverride[];

export default AnatomyHandler;