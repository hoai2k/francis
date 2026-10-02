// Wild Rides vehicle pack (see buildVehicle in ../characters.js for the contract).
export default [
  {
    id: 'hoverboard', name: 'Hover Scooter', form: 'Hover scooter', blurb: 'Floats over everything',
    stats: { speed: 3, accel: 4, handling: 4, weight: 2 }, colors: [0x36aebf, 0xf2cd37],
    build({ THREE, BrickBuilder, C }) {
      const b = new BrickBuilder(0.4);
      b.box(0, 0.05, -0.1, 1.5, 0.3, 3.6, 0x36aebf);
      b.box(0, 0.35, -0.5, 0.9, 0.3, 1.2, C.dkgray);
      for (const sd of [-1, 1]) b.cyl(sd * 0.55, -0.12, -1.4, 0.28, 0.18, C.yellow, { matOpts: { emissive: 0x40c0ff, emissiveIntensity: 1.2 } });
      b.box(0, 0.35, 1.3, 0.3, 0.9, 0.3, C.dkgray);
      const fin = new THREE.Group(); fin.position.set(0, 0.5, -1.8);
      const fb = new BrickBuilder(0.4); fb.box(0, 0, 0, 0.1, 0.7, 0.6, C.yellow); fin.add(fb.build());
      return { mesh: b.build({ name: 'hover' }), seat: [0, 0.75, -0.4], control: 'bars', hover: 0.45, steer: [{ obj: fin, axis: 'y', amount: 0.5 }], parts: [fin] };
    },
  },
];
