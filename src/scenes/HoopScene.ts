import {
  Scene,
  Mesh,
  PerspectiveCamera,
  Group,
  DirectionalLight,
  AmbientLight,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import type { Viewport, Clock, Lifecycle } from "~/core";

gsap.registerPlugin(ScrollTrigger);

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
  private isVisible: boolean = false;
  private textElement?: HTMLElement;
  private scrollProgress: number = 0;
  private wheelEnabled: boolean = false;
  private arenaVisible: boolean = false;

  public constructor({ clock, camera, viewport }: MainSceneParamaters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;

    this.light1 = new DirectionalLight(0xffffff, 1);
    this.light1.position.set(0, 0, -5);
    this.add(this.light1);

    // Ajouter une lumière ambiante pour mieux voir la scène
    const ambientLight = new AmbientLight(0x404040, 0.5);
    this.add(ambientLight);

    // Créer l'élément de texte pour cette scène
    this.createTextElement();

    this.setupWheelListener();
  }

  private setupWheelListener(): void {
    // Sensibilité et limites
    const sensitivity = 0.0005;

    let effectsActive = false;

    // Écouteur d'événement wheel
    window.addEventListener("wheel", (event) => {
      // Ne traiter l'événement que si la première scène a terminé son animation
      if (!this.wheelEnabled) return;

      // Mettre à jour le progrès du défilement
      this.scrollProgress += event.deltaY * sensitivity;

      // Limiter les valeurs entre 0 et 1
      this.scrollProgress = Math.max(0, Math.min(this.scrollProgress, 1));

      if (this.scrollProgress >= 0.95 && !effectsActive) {
        effectsActive = true;
        const effectsEvent = new CustomEvent("hoopSceneFullyScrolled", {
          detail: true,
        });
        document.dispatchEvent(effectsEvent);
      } else if (this.scrollProgress < 0.9 && effectsActive) {
        effectsActive = false;
        const effectsEvent = new CustomEvent("hoopSceneFullyScrolled", {
          detail: false,
        });
        document.dispatchEvent(effectsEvent);
      }

      // Utiliser le seuil de 0.7 comme dans ScrollTrigger
      if (this.scrollProgress > 0.7 && !this.isVisible) {
        this.showScene();
      } else if (this.scrollProgress <= 0.7 && this.isVisible) {
        this.hideScene();
      }

      if (this.model) {
        // Calculer la progression normalisée (0-1) après avoir dépassé le seuil de 0.7
        const modelProgress =
          this.scrollProgress > 0.7
            ? Math.min(1, (this.scrollProgress - 0.7) / 0.3)
            : 0;

        const rightOffset = 2;

        // Animer la position du modèle
        this.model.position.x =
          10 * (1 - modelProgress) + rightOffset * modelProgress;

        if (this.arenaVisible) {
          // Déplacer le panier vers le haut quand l'arène est visible
          this.model.position.y = modelProgress * 10; // De 0 à 10

          // Réduire l'échelle du panier progressivement pour le faire disparaître
          const fadeOutScale = 4.5 * (1 - modelProgress);
          this.model.scale.set(fadeOutScale, fadeOutScale, fadeOutScale);
        } else {
          // Position et échelle normales quand l'arène n'est pas visible
          this.model.position.y = 0;
          this.model.scale.set(4.5, 4.5, 4.5);
        }

        // Rotation et échelle
        this.model.rotation.y = Math.PI * 2 * modelProgress;
        this.model.scale.set(4.5, 4.5, 4.5);
      }
    });

    // Écouter un événement pour savoir quand activer la détection wheel
    document.addEventListener("ballAnimationComplete", () => {
      this.wheelEnabled = true;
    });

    document.addEventListener("thirdSceneVisible", (event: Event) => {
      const customEvent = event as CustomEvent;
      this.arenaVisible = customEvent.detail;

      if (customEvent.detail) {
        // Masquer le texte "MAKE A SHOT" quand l'arène est visible
        if (this.textElement) {
          gsap.to(this.textElement, {
            opacity: 0,
            duration: 0.5,
            ease: "power2.in",
          });
        }
      } else {
        // Réafficher le texte quand l'arène n'est plus visible
        if (this.isVisible && this.textElement) {
          gsap.to(this.textElement, {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
          });
        }
      }
    });
  }

  private createTextElement(): void {
    this.textElement = document.createElement("h2");
    this.textElement.textContent = "PLAY BASKET ON THE STREET";
    this.textElement.style.position = "absolute";
    this.textElement.style.right = "10%";
    this.textElement.style.top = "40%";
    this.textElement.style.transform = "translateY(-50%)";
    this.textElement.style.color = "#e67e22"; // Orange pour contraster avec le texte rouge de l'autre scène
    this.textElement.style.fontSize = "3rem";
    this.textElement.style.opacity = "0"; // Caché au début
    this.textElement.style.zIndex = "100";
    document.body.appendChild(this.textElement);
  }

  private showScene(): void {
    this.isVisible = true;
    this.visible = true; // Rendre visible

    // Animer l'apparition du texte
    gsap.to(this.textElement!, {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    });

    // Émettre l'événement
    const event = new CustomEvent("secondSceneVisible", { detail: true });
    document.dispatchEvent(event);
  }

  private hideScene(): void {
    this.isVisible = false;
    this.visible = false; // Rendre la scène invisible

    // Animer la disparition du texte
    gsap.to(this.textElement!, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.in",
    });

    // Émettre un événement pour montrer à nouveau la première scène
    const event = new CustomEvent("secondSceneVisible", { detail: false });
    document.dispatchEvent(event);
  }

  public async load(): Promise<void> {
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync("./assets/models/basketBallHoop.glb");
      this.model = gltf.scene;

      this.model.scale.set(6.5, 6.5, 6.5);
      //this.model.position.set(-50, 0, 0);

      this.model.rotation.x = 45;
      this.model.rotation.y = 90;
      this.model.rotation.z = 90;

      this.add(this.model);
    } catch (error) {
      console.error("Erreur lors du chargement du modèle:", error);
    }
  }

  public update(): void {
    this.light1.position.copy(this.camera.position);
  }

  // Ajouter cette méthode à la classe HoopScene
  public isArenaVisible(): boolean {
    return this.arenaVisible;
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

    // Supprimer le texte
    if (this.textElement && this.textElement.parentNode) {
      this.textElement.parentNode.removeChild(this.textElement);
    }

    // Nettoyer les triggers
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger.vars.trigger === "#canvas-container") {
        trigger.kill();
      }
    });
  }
}
