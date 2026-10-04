// The roster for "Simplified mode" (Options → Simplified mode): the drivers and karts the select
// screen offers, as one grid without movie headings, and the ones CPU racers use when it's on.
// Lists of ids (DRIVERS[].id / KARTS[].id); null means "all of them". Pick the set in
// brick-kart/workbench/ (it starts from this one) and export it, then paste the ids here.
export const SIMPLIFIED = {
  // 82 drivers
  drivers: [
    'classic-ava', 'classic-redbeard', 'classic-kara', 'classic-rex', 'classic-nix',
    'classic-wendel', 'classic-pepper', 'classic-bjorn', 'classic-regina', 'classic-zorp',
    'classic-max', 'spiderman', 'ironman', 'captain', 'thor', 'hulk', 'panther', 'strange',
    'starlord', 'rocket', 'groot', 'loki', 'thanos', 'luke', 'leia', 'han', 'chewie', 'r2d2',
    'yoda', 'mando', 'grogu', 'vader', 'maul', 'boba', 'cadbane', 'jawas', 'harry', 'hermione',
    'ron', 'hagrid', 'snape', 'dobby', 'bellatrix', 'gojo', 'yuji', 'megumi', 'panda', 'sukuna',
    'mahito', 'jogo', 'transfigured', 'owen', 'claire', 'grant', 'malcolm', 'hammond', 'blue',
    'indominus', 'delta', 'spinosaurus', 'brachiosaurus', 'steve', 'alex', 'creeper-mob', 'zombie',
    'skeleton', 'enderman', 'villager', 'irongolem', 'pig', 'pikachu', 'charmander', 'squirtle',
    'bulbasaur', 'eevee', 'jigglypuff', 'lucario', 'mewtwo', 'charizard', 'sonic-hog', 'tails',
    'knuckles',
  ],
  // 41 karts
  karts: [
    'bob', 'ava', 'redbeard', 'nix', 'flo', 'cassie', 'thunderhog', 'bigstomp', 'treadhead',
    'tubthumper', 'hotdiggity', 'blastsled', 'landspeeder', 'speederbike', 'podracer', 'tie',
    'jpjeep', 'gyrosphere', 'tourcar', 'talon', 'starkcar', 'goatchariot', 'firebolt', 'ijichi',
    'carpet', 'dragon', 'minecart', 'saddlepig', 'tntcart', 'pokeballkart', 'rapidash', 'arcanine',
    'koraidon', 'speedstar', 'tornado', 'eggmobile', 'bjorn', 'regina', 'sam', 'zorp', 'dina',
  ],
};

// is this driver / kart id in the simplified set?
export const simpleDriver = (id) => !SIMPLIFIED.drivers || SIMPLIFIED.drivers.includes(id);
export const simpleKart = (id) => !SIMPLIFIED.karts || SIMPLIFIED.karts.includes(id);
