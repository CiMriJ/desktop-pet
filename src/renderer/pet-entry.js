import { createPetApp } from './pet.js';

const params = new URLSearchParams(window.location.search);
const pet = params.get('pet') === 'bubu' ? 'bubu' : 'yier';

createPetApp(pet);
