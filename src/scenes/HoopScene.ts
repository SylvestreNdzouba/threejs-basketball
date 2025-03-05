import { Scene, Mesh, PerspectiveCamera, Group, DirectionalLight } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { Viewport, Clock, Lifecycle } from "~/core";

export interface MainSceneParamaters {
  clock: Clock;
  camera: PerspectiveCamera;
  viewport: Viewport;
}

export class HoopScene extends Scene implements Lifecycle {
  public clock: Clock;
  public camera: PerspectiveCamera;
  public viewport: Viewport;
  public model?: Group;
  public light1: DirectionalLight;

  public constructor({ clock, camera, viewport }: MainSceneParamaters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;

    this.light1 = new DirectionalLight(0xffffff, 1);
    this.light1.position.set(0, 0, -5);
    this.add(this.light1);
  }

  public async load(): Promise<void> {
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync("./assets/models/basketball.glb");
      this.model = gltf.scene;
      this.model.scale.set(1, 1, 1);
      this.model.position.set(0, 0, 0);
      this.add(this.model);
    } catch (error) {
      console.error("Erreur lors du chargement du modèle:", error);
    }
  }

  public update(): void {
    this.light1.position.copy(this.camera.position);
    if (this.model) {
      this.model.rotation.y += 0.0002 * this.clock.delta;
    }
  }

  public resize(): void {
    this.camera.aspect = this.viewport.ratio;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    if (this.model) {
      this.model.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose();
          if (child.material) {
            child.material.dispose();
          }
        }
      });
    }
  }
}
