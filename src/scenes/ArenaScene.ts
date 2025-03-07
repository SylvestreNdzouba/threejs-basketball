import {
  Scene,
  Mesh,
  PerspectiveCamera,
  Group,
  DirectionalLight,
  AmbientLight,
  MeshStandardMaterial,
  Raycaster,
  Vector2,
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
  private basketballs: Mesh[] = [];
  private raycaster: Raycaster;
  private mouse: Vector2;
  private hasTriggeredFinalScene: boolean = false;

  private originalCameraRotation = {
    x: 0,
    y: 0,
    z: 0,
  };
  private boundClickHandler: (event: MouseEvent) => void;

  public constructor({ clock, camera, viewport }: ArenaSceneParameters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;

    this.raycaster = new Raycaster();
    this.mouse = new Vector2();

    this.originalCameraRotation = {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z,
    };

    // Créer des lumières
    this.light1 = new DirectionalLight(0xffffff, 1);
    this.light1.position.set(0, 5, 0);
    this.add(this.light1);

    const ambientLight = new AmbientLight(0xffffff, 0.8);
    this.add(ambientLight);

    // Créer l'élément de texte
    this.createTextElement();

    // Configurer le wheel listener
    this.setupWheelListener();

    // IMPORTANT: UN SEUL écouteur de clic
    this.boundClickHandler = this.onMouseClick.bind(this);
    window.addEventListener("click", this.boundClickHandler);

    // Autres écouteurs d'événements
    document.addEventListener("checkArenaVisibility", (event) => {
      event.preventDefault();
      return this.isVisible;
    });

    document.addEventListener("hideArenaScene", () => {
      this.hideScene();
    });
  }

  private setupWheelListener(): void {
    // Sensibilité et limites
    const sensitivity = 0.0005;

    // Variable pour suivre les rotations additionnelles après scroll = 1
    let extraRotations = 0;
    const maxExtraRotations = 1;

    let effectsActive = false;

    // Écouteur d'événement wheel
    window.addEventListener("wheel", (event) => {
      // Ne traiter l'événement que si la scène précédente a activé celle-ci
      if (!this.wheelEnabled) return;

      if (this.scrollProgress >= 1) {
        // Une fois à 1, continuer à accumuler des rotations supplémentaires
        if (extraRotations < maxExtraRotations) {
          extraRotations += Math.abs(event.deltaY * sensitivity * 0.2); // Vitesse de rotation contrôlée

          // Vérifier si on a atteint le nombre de rotations requis
          if (
            extraRotations >= maxExtraRotations &&
            !this.hasTriggeredFinalScene
          ) {
            this.hasTriggeredFinalScene = true;

            // Déclenchement de l'événement pour la FinalScene
            const event = new CustomEvent("arenaRotationComplete", {
              detail: true,
            });
            document.dispatchEvent(event);

            // Désactiver le wheel pour cette scène
            this.wheelEnabled = false;
          }
        }
      } else {
        this.scrollProgress += event.deltaY * sensitivity;
        // Limiter les valeurs entre 0 et 1
        this.scrollProgress = Math.max(0, Math.min(this.scrollProgress, 1));
      }

      // Activer des effets spéciaux lorsque le scroll atteint son maximum
      if (this.scrollProgress >= 0.95 && !effectsActive) {
        effectsActive = true;
        const effectsEvent = new CustomEvent("arenaSceneFullyScrolled", {
          detail: true,
        });
        document.dispatchEvent(effectsEvent);
      } else if (this.scrollProgress < 0.9 && effectsActive) {
        effectsActive = false;
        const effectsEvent = new CustomEvent("arenaSceneFullyScrolled", {
          detail: false,
        });
        document.dispatchEvent(effectsEvent);
      }

      // Utiliser le seuil de 0.7 comme dans les autres scènes
      if (this.scrollProgress > 0.7 && !this.isVisible) {
        this.showScene();
      } else if (this.scrollProgress <= 0.7 && this.isVisible) {
        this.hideScene();
      }

      // Animation de l'arène basée sur le scroll
      if (this.model) {
        // Calculer la progression normalisée après avoir dépassé le seuil
        const modelProgress =
          this.scrollProgress > 0.7
            ? Math.min(1, (this.scrollProgress - 0.7) / 0.3)
            : 0;

        // Animer l'arène qui monte depuis le bas
        this.model.position.y = -10.7 + modelProgress * 10;
        this.model.position.z = -10; // De -10 à 0

        // Rotation de l'arène - normale + rotations supplémentaires après scroll = 1
        this.model.rotation.y =
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
        this.wheelEnabled = true;
      }
    });

    if (extraRotations >= maxExtraRotations) {
      const event = new CustomEvent("arenaRotationComplete", { detail: true });
      document.dispatchEvent(event);

      // Désactiver le wheel pour cette scène
      this.wheelEnabled = false;
    }
  }

  private createTextElement(): void {
    this.textElement = document.createElement("h2");
    this.textElement.textContent = "EXPERIENCE THE BIGGEST ARENA";
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

    // S'assurer que tous les objets sont également invisibles
    this.traverse((object) => {
      object.visible = false;
    });

    // Arrêter toutes les animations GSAP en cours
    if (this.model) {
      gsap.killTweensOf(this.model.position);
      gsap.killTweensOf(this.model.rotation);
    }

    // Animer la disparition du texte et masquer complètement l'élément
    if (this.textElement) {
      gsap.to(this.textElement, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => {
          if (this.textElement) {
            this.textElement.style.display = "none"; // Masquer complètement l'élément
          }
        },
      });
    }

    // Émettre un événement pour montrer à nouveau la scène précédente
    const event = new CustomEvent("thirdSceneVisible", { detail: false });
    document.dispatchEvent(event);
  }

  public hideTitle(): void {
    if (this.textElement) {
      gsap.killTweensOf(this.textElement);
      gsap.to(this.textElement, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          if (this.textElement) {
            this.textElement.style.display = "none";
          }
        },
      });
    }
  }

  public async load(): Promise<void> {
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync("./public/basketballCourt.glb");
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

      this.add(this.model);
    } catch (error) {
      console.error("Erreur lors du chargement du modèle d'arène:", error);
    }
  }

  private onMouseClick(event: MouseEvent): void {
    // Calculer la position normalisée de la souris
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Mettre à jour le raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  public update(): void {
    // Mettre à jour la position de la lumière directionnelle
    this.light1.position.copy(this.camera.position);

    // Animation de l'arène
    if (this.isVisible && this.model) {
      // Rotation de l'arène
      this.model.rotation.y += 0.0002 * this.clock.delta;

      if (this.scrollProgress >= 0.95) {
        this.model.rotation.y += 0.0001 * this.clock.delta;
      }
    }
  }

  public resize(): void {
    this.camera.aspect = this.viewport.ratio;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    if (this.model) {
      window.removeEventListener("click", this.boundClickHandler);

      // Nettoyer les ballons
      for (const ball of this.basketballs) {
        ball.geometry.dispose();
        if ((ball as any).material.dispose) {
          (ball as any).material.dispose();
        }
      }
      this.basketballs = [];
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
