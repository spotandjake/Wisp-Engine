// This module collects our UI elements from the dom
export const cameraToggle = document.getElementById('ct') as HTMLInputElement;
export const cameraPositions = {
  x: document.getElementById('cx') as HTMLInputElement,
  y: document.getElementById('cy') as HTMLInputElement,
  z: document.getElementById('cz') as HTMLInputElement,
}
export const cameraRotations = {
  x: document.getElementById('cRotx') as HTMLInputElement,
  y: document.getElementById('cRoty') as HTMLInputElement,
  z: document.getElementById('cRotz') as HTMLInputElement,
}