// This module collects our UI elements from the dom

// Camera
export const cameraToggle = document.getElementById("ct") as HTMLInputElement;
export const cameraPositions = {
  x: document.getElementById("cx") as HTMLInputElement,
  y: document.getElementById("cy") as HTMLInputElement,
  z: document.getElementById("cz") as HTMLInputElement,
};
export const cameraRotations = {
  x: document.getElementById("cRotx") as HTMLInputElement,
  y: document.getElementById("cRoty") as HTMLInputElement,
  z: document.getElementById("cRotz") as HTMLInputElement,
};

// Item Movement
export const itemToggles = {
  cubeA: document.getElementById("itemA") as HTMLInputElement,
  cubeB: document.getElementById("itemB") as HTMLInputElement,
  cubeC: document.getElementById("itemC") as HTMLInputElement,
};

export const itemPositions = {
  x: document.getElementById("ix") as HTMLInputElement,
  y: document.getElementById("iy") as HTMLInputElement,
  z: document.getElementById("iz") as HTMLInputElement,
};

export const itemRotations = {
  x: document.getElementById("iRotx") as HTMLInputElement,
  y: document.getElementById("iRoty") as HTMLInputElement,
  z: document.getElementById("iRotz") as HTMLInputElement,
};

export const itemScales = {
  x: document.getElementById("iScalex") as HTMLInputElement,
  y: document.getElementById("iScaley") as HTMLInputElement,
  z: document.getElementById("iScalez") as HTMLInputElement,
};
