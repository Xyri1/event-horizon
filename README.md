# Event Horizon - WebGPU General Relativity Simulation

A real-time, interactive simulation of a rotating (Kerr) black hole and its accretion disk, rendered directly in the browser using the **WebGPU API**.

This project solves the geodesic equations of light rays traveling through curved spacetime to visualize phenomena like gravitational lensing, the Einstein ring, relativistic Doppler beaming, and the black hole shadow.

## 🌌 Physics Implementation

Unlike standard 3D rendering which assumes light travels in straight lines (Euclidean geometry), this simulation performs **General Relativistic Ray Marching**. Every pixel on the screen represents a photon that is traced backwards from the camera into the scene, bending according to the intense gravity of the black hole.

### 1. Curved Spacetime (Geodesics)
The path of light is determined by numerically integrating the geodesic equations. To achieve real-time performance (60 FPS) on consumer hardware, we use a high-fidelity approximation of the **Kerr Metric**:

*   **Schwarzschild Term:** Simulates the primary bending of light due to mass.
*   **Gravitomagnetism (Frame Dragging):** Simulates the "Lense-Thirring effect". As the black hole spins, it drags spacetime along with it. We model this using a gravitomagnetic "spin force" roughly analogous to the Lorentz force in electromagnetism ($F = v \times B$), where the black hole's angular momentum acts as the magnetic field. This causes the shadow of the black hole to become asymmetric and "D-shaped".

### 2. Volumetric Accretion Disk
The accretion disk is not a flat geometry but a **volumetric density field** rendered using ray-marching.

*   **Keplerian Dynamics:** Gas in the disk rotates at near-light speeds ($v \approx 0.5c$ near the center).
*   **Relativistic Doppler Beaming:** Also known as the "headlight effect". Gas moving *towards* the observer (the left side of the image usually) appears significantly brighter and bluer. Gas moving *away* appears dimmer and redder.
    *   Formula: $I_{obs} = I_{emit} \cdot D^4$ where $D$ is the relativistic Doppler factor.
*   **Gravitational Redshift:** Photons climbing out of the deep gravity well lose energy, shifting their color towards red and decreasing their intensity.

### 3. The Shadow & Event Horizon
*   **Event Horizon:** The boundary where light can no longer escape ($r < r_s$).
*   **Photon Sphere:** The region where gravity is so strong that light can orbit the black hole. The sharp "ring" seen in the visualization is actually the back of the accretion disk, warped over the top and bottom of the black hole by gravity.

## 🛠 Tech Stack

*   **WebGPU:** Next-generation graphics API for high-performance compute and rendering.
*   **WGSL:** WebGPU Shading Language used for the physics kernel.
*   **React:** UI and state management.
*   **TypeScript:** Type safety.
*   **Tailwind CSS:** Styling.

## 🎛 Controls

*   **Spin Parameter (a):** Controls the rotation speed of the black hole. Higher spin creates more extreme frame dragging.
*   **Accretion Lum:** Adjusts the density and brightness of the matter surrounding the black hole.
*   **Gravitational Lensing:** Toggle the bending of light to compare with Newtonian physics (flat space).
*   **Camera:** Drag to orbit, scroll to zoom.

## 🚀 Performance Metrics

The simulation includes a performance monitor showing:
*   **FPS:** Frames Per Second.
*   **Frame Time:** The time (in milliseconds) it takes the GPU to compute the physics for a single frame.

## ⚠️ Requirements

This application requires a browser with **WebGPU support** enabled (e.g., Chrome 113+, Edge, or Firefox Nightly).

---

*Powered by React & WebGPU*
