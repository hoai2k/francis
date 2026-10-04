// The roster for "Simplified mode" (Options → Simplified mode): the drivers and karts the select
// screen offers, as one grid without movie headings. CPU racers still use the whole roster.
// Lists of ids (DRIVERS[].id / KARTS[].id / GLIDERS[].id); null means "all of them". Pick the set in
// brick-kart/workbench/ (it starts from this one) and export it, then paste the ids here.
export const SIMPLIFIED = {
  // 80 drivers
  drivers: [
    'classic-redbeard', 'classic-kara', 'classic-rex', 'classic-nix', 'classic-pepper',
    'classic-bjorn', 'classic-regina', 'classic-zorp', 'classic-max', 'spiderman', 'ironman',
    'captain', 'thor', 'hulk', 'panther', 'strange', 'starlord', 'gamora', 'drax', 'rocket',
    'groot', 'loki', 'thanos', 'luke', 'leia', 'han', 'chewie', 'r2d2', 'c3po', 'mando',
    'vader', 'maul', 'boba', 'cadbane', 'trooper', 'jawas', 'harry', 'hermione', 'ron',
    'dumbledore', 'hagrid', 'snape', 'draco', 'gojo', 'yuji', 'megumi', 'panda', 'nanami', 'sukuna',
    'mahito', 'jogo', 'transfigured', 'owen', 'grant', 'malcolm', 'hammond', 'trex', 'delta',
    'dilophosaurus', 'spinosaurus', 'brachiosaurus', 'steve', 'alex', 'creeper-mob', 'zombie',
    'skeleton', 'enderman', 'villager', 'pig', 'pikachu', 'charmander', 'squirtle', 'bulbasaur',
    'eevee', 'jigglypuff', 'mewtwo', 'charizard', 'sonic-hog', 'tails', 'knuckles',
  ],
  // 41 karts
  karts: [
    'bob', 'ava', 'redbeard', 'nix', 'flo', 'cassie', 'thunderhog', 'bigstomp', 'treadhead',
    'tubthumper', 'hotdiggity', 'blastsled', 'landspeeder', 'speederbike', 'podracer', 'tie',
    'jpjeep', 'gyrosphere', 'tourcar', 'talon', 'starkcar', 'goatchariot', 'firebolt', 'ijichi',
    'carpet', 'dragon', 'minecart', 'saddlepig', 'tntcart', 'pokeballkart', 'rapidash', 'arcanine',
    'koraidon', 'speedstar', 'tornado', 'eggmobile', 'bjorn', 'regina', 'sam', 'zorp', 'dina',
  ],
  // 25 gliders
  gliders: [
    'kartwing', 'parasol', 'paperplane', 'butterfly', 'balloon', 'dragonwing', 'gyrocopter', 'kite',
    'brickplate', 'repulsorwing', 'webglider', 'sfoilwing', 'tiepanels', 'fawkes', 'maraudersmap',
    'nueglider', 'malevolentshrine', 'pteraride', 'parkparasail', 'mc-elytra', 'mc-ghast',
    'pk-charizard', 'pk-pokeball', 'sn-tornado', 'sn-tails',
  ],
};

// is this driver / kart / glider id in the simplified set?
export const simpleDriver = (id) => !SIMPLIFIED.drivers || SIMPLIFIED.drivers.includes(id);
export const simpleKart = (id) => !SIMPLIFIED.karts || SIMPLIFIED.karts.includes(id);
export const simpleGlider = (id) => !SIMPLIFIED.gliders || SIMPLIFIED.gliders.includes(id);
