// Original Karts: the founding racers' own rides, rebuilt as distinct vehicles
// (see buildVehicle in ../characters.js for the contract). Order matters: vehicles.js
// shows the first half at the start of the kart grid and the rest at the end, in the
// same order as CHARACTERS (ids match the character ids). Sir Kara's, Wizard Wendel's and
// Chef Pepper's karts were retired (the drivers stay).
import { bob, ava, redbeard, rex, nix, flo } from './originals-a.js';
import { cassie, bjorn, regina, sam, zorp, max, dina } from './originals-b.js';

export default [bob, ava, redbeard, rex, nix, flo, cassie, bjorn, regina, sam, zorp, max, dina];
