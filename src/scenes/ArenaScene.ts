import {
  Scene,
  Mesh,
  PerspectiveCamera,
  Group,
  DirectionalLight,
  AmbientLight,
  Vector3,
  MeshStandardMaterial,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import type { Viewport, Clock, Lifecycle } from "~/core";

gsap.registerPlugin(ScrollTrigger);

export interface ArenaSceneParameters {
  clock: Clock;
  camera: PerspectiveCamera;
  viewport: Viewport;
}

export class ArenaScene extends Scene implements Lifecycle {
  public clock: Clock;
  public camera: PerspectiveCamera;
  public viewport: Viewport;
  public model?: Group;
  public light1: DirectionalLight;
  private isVisible: boolean = false;
  private textElement?: HTMLElement;
  private scrollProgress: number = 0;
  private wheelEnabled: boolean = false;
  private originalCameraPosition: Vector3;
  public pivotGroup?: Group;
  private originalCameraRotation = {
    x: 0,
    y: 0,
    z: 0,
  };

  public constructor({ clock, camera, viewport }: ArenaSceneParameters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;

    // Sauvegarder la position et rotation originales de la caméra
    this.originalCameraPosition = camera.position.clone();
    this.originalCameraRotation = {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z,
    };

    this.pivotGroup = new Group();
    this.add(this.pivotGroup);

    // Créer des lumières pour bien éclairer l'arène
    this.light1 = new DirectionalLight(0xffffff, 1);
    this.light1.position.set(0, 5, 0);
    this.add(this.light1);

    // Ajouter une lumière ambiante pour mieux voir la scène intérieure
    const ambientLight = new AmbientLight(0xffffff, 0.8);
    this.add(ambientLight);

    // Créer l'élément de texte pour cette scène
    this.createTextElement();

    // Configuration de l'écouteur d'événements pour le défilement
    this.setupWheelListener();

    document.addEventListener("checkArenaVisibility", (event) => {
      event.preventDefault();
      return this.isVisible;
    });
  }

  private setupWheelListener(): void {
    console.log("Setting up wheel listener for ArenaScene");

    // Sensibilité et limites
    const sensitivity = 0.0005;

    // Variable pour suivre les rotations additionnelles après scroll = 1
    let extraRotations = 0;
    const maxExtraRotations = 3;

    let effectsActive = false;

    // Écouteur d'événement wheel
    window.addEventListener("wheel", (event) => {
      // Ne traiter l'événement que si la scène précédente a activé celle-ci
      if (!this.wheelEnabled) return;

      // Mettre à jour le progrès du défilement
      if (this.scrollProgress >= 1) {
        // Une fois à 1, continuer à accumuler des rotations supplémentaires
        if (extraRotations < maxExtraRotations) {
          extraRotations += Math.abs(event.deltaY * sensitivity * 0.2); // Vitesse de rotation contrôlée
          console.log("Rotations supplémentaires:", extraRotations);
        }
      } else {
        this.scrollProgress += event.deltaY * sensitivity;
        // Limiter les valeurs entre 0 et 1
        this.scrollProgress = Math.max(0, Math.min(this.scrollProgress, 1));
      }

      console.log("ArenaScene wheel progress:", this.scrollProgress);

      // Activer des effets spéciaux lorsque le scroll atteint son maximum
      if (this.scrollProgress >= 0.95 && !effectsActive) {
        effectsActive = true;
        const effectsEvent = new CustomEvent("arenaSceneFullyScrolled", {
          detail: true,
        });
        document.dispatchEvent(effectsEvent);
        console.log(
          "Activating arena max effects at scroll:",
          this.scrollProgress
        );
      } else if (this.scrollProgress < 0.9 && effectsActive) {
        effectsActive = false;
        const effectsEvent = new CustomEvent("arenaSceneFullyScrolled", {
          detail: false,
        });
        document.dispatchEvent(effectsEvent);
        console.log(
          "Deactivating arena effects at scroll:",
          this.scrollProgress
        );
      }

      // Utiliser le seuil de 0.7 comme dans les autres scènes
      if (this.scrollProgress > 0.7 && !this.isVisible) {
        console.log("Showing ArenaScene at progress:", this.scrollProgress);
        this.showScene();
      } else if (this.scrollProgress <= 0.7 && this.isVisible) {
        console.log("Hiding ArenaScene at progress:", this.scrollProgress);
        this.hideScene();
      }

      // Animation de l'arène basée sur le scroll
      if (this.model) {
        this.model.position.z = -5;
        // Calculer la progression normalisée après avoir dépassé le seuil
        const modelProgress =
          this.scrollProgress > 0.7
            ? Math.min(1, (this.scrollProgress - 0.7) / 0.3)
            : 0;

        // Animer l'arène qui monte depuis le bas
        this.model.position.y = -10.5 + modelProgress * 10; // De -10 à 0

        // Rotation de l'arène - normale + rotations supplémentaires après scroll = 1
        if (this.pivotGroup)
          this.pivotGroup.rotation.y =
            Math.PI * modelProgress * 0.5 + Math.PI * 2 * extraRotations;

        // Animation de la caméra pour donner l'impression d'être à l'intérieur
        if (modelProgress > 0.8) {
          // Le reste du code reste inchangé
          // Calculer la progression pour le mouvement de caméra
          const cameraProgress = (modelProgress - 0.8) / 0.2; // 0 à 1 sur les derniers 20%

          // Déplacer la caméra au centre de l'arène
          this.camera.position.x +=
            (0 - this.camera.position.x) * cameraProgress * 0.05;
          this.camera.position.y +=
            (1 - this.camera.position.y) * cameraProgress * 0.05;
          this.camera.position.z +=
            (0 - this.camera.position.z) * cameraProgress * 0.05;

          // Ajuster la rotation de la caméra pour regarder vers le haut
          this.camera.rotation.x +=
            (this.originalCameraRotation.x +
              Math.PI / 4 -
              this.camera.rotation.x) *
            cameraProgress *
            0.05;
        }
      }
    });

    // Écouter un événement pour savoir quand activer la détection wheel
    document.addEventListener("hoopSceneFullyScrolled", (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        console.log(
          "Hoop scene fully scrolled, enabling ArenaScene wheel detection"
        );
        this.wheelEnabled = true;
      }
    });
  }

  private createTextElement(): void {
    this.textElement = document.createElement("h2");
    this.textElement.textContent = "PLAY IN THE BIGGEST STADIUM";
    this.textElement.style.position = "absolute";
    this.textElement.style.left = "50%";
    this.textElement.style.bottom = "15%";
    this.textElement.style.transform = "translateX(-50%)";
    this.textElement.style.color = "#ffca00"; // Jaune doré pour un effet "championnat"
    this.textElement.style.fontSize = "3.5rem";
    this.textElement.style.fontWeight = "bold";
    this.textElement.style.textAlign = "center";
    this.textElement.style.opacity = "0"; // Caché au début
    this.textElement.style.zIndex = "100";
    this.textElement.style.textShadow = "0 0 10px rgba(0,0,0,0.5)"; // Ombre pour meilleure lisibilité
    document.body.appendChild(this.textElement);
  }

  private showScene(): void {
    this.isVisible = true;
    this.visible = true; // Rendre visible

    console.log("Showing ArenaScene");

    // Animer l'apparition du texte
    gsap.to(this.textElement!, {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    });

    // Émettre l'événement
    const event = new CustomEvent("thirdSceneVisible", { detail: true });
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

    // Émettre un événement pour montrer à nouveau la scène précédente
    const event = new CustomEvent("thirdSceneVisible", { detail: false });
    document.dispatchEvent(event);
  }

  public async load(): Promise<void> {
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync("./assets/models/basketArena.glb");
      this.model = gltf.scene;

      // Ajuster l'échelle de l'arène
      this.model.scale.set(0.5, 0.5, 0.5);

      // Positionner l'arène en dessous de l'écran (pour l'animation d'entrée)
      this.model.position.set(0, -10, 0);

      // Ajouter du matériau émissif à certaines parties pour le bloom
      this.model.traverse((child) => {
        if (child instanceof Mesh && child.material) {
          // Si le nom du mesh contient "Light" ou "Lamp", le rendre émissif
          if (
            child.name.toLowerCase().includes("light") ||
            child.name.toLowerCase().includes("lamp") ||
            child.name.toLowerCase().includes("screen")
          ) {
            const stdMaterial = child.material as MeshStandardMaterial;
            stdMaterial.emissive.set(0xffffff);
            stdMaterial.emissiveIntensity = 2;
          }
        }
      });

      if (this.pivotGroup) {
        this.pivotGroup.add(this.model);

        // Positionner le pivot à l'emplacement de la caméra
        this.pivotGroup.position.copy(this.camera.position);

        // Positionner l'arène relativement au pivot
        // On applique un décalage pour que l'arène reste visible devant la caméra
        this.model.position.set(0, -10, -15);
      }
      console.log("Arena model loaded successfully");
    } catch (error) {
      console.error("Erreur lors du chargement du modèle d'arène:", error);
    }
  }

  public update(): void {
    this.light1.position.copy(this.camera.position);

    if (this.isVisible && this.model) {
      if (this.pivotGroup)
        this.pivotGroup.rotation.y += 0.0002 * this.clock.delta;

      if (this.scrollProgress >= 0.95) {
        if (this.pivotGroup)
          this.pivotGroup.rotation.y += 0.0001 * this.clock.delta;
      }
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
            // Disposer du matériau, qu'il soit simple ou un tableau
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    // Supprimer le texte
    if (this.textElement && this.textElement.parentNode) {
      this.textElement.parentNode.removeChild(this.textElement);
    }
  }
}
