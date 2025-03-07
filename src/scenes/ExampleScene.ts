import {
  Scene,
  Mesh,
  PerspectiveCamera,
  Group,
  DirectionalLight,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  AmbientLight,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { eventBus } from "../utils/EventBus";

import type { Viewport, Clock, Lifecycle } from "~/core";

gsap.registerPlugin(ScrollTrigger);

export interface MainSceneParamaters {
  clock: Clock;
  camera: PerspectiveCamera;
  viewport: Viewport;
}

export class ExampleScene extends Scene implements Lifecycle {
  public clock: Clock;
  public camera: PerspectiveCamera;
  public viewport: Viewport;
  public model?: Group;
  public light1: DirectionalLight;
  private isAnimationActive: boolean = false;
  private textElement?: HTMLElement;
  private floor?: Mesh;
  private timeSinceLastBounce: number = 0;
  private isRebounding: boolean = false;
  private reboundStartPosition: Vector3 = new Vector3();
  private floorShaderMaterial?: ShaderMaterial;
  private lastBounceTime: number = 0;

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

    // Créer l'élément h2 qui apparaîtra plus tard
    this.createHeadingElement();

    // Écouter l'événement de fin d'animation de verre brisé
    eventBus.on("glassBreakComplete", () => {
      this.setupBallAnimation();
    });

    document.addEventListener("secondSceneVisible", ((event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail === true) {
        // La deuxième scène devient visible, cacher les éléments de cette scène
        this.hideSceneElements();
      } else {
        // La deuxième scène se cache, montrer à nouveau les éléments de cette scène
        this.showSceneElements();
      }
    }) as EventListener);
  }

  private hideSceneElements(): void {
    // Animer le ballon vers la gauche et hors de l'écran
    if (this.model) {
      gsap.to(this.model.position, {
        x: -10,
        duration: 0.8,
        ease: "power2.in",
      });

      gsap.to(this.model.scale, {
        x: 0.5,
        y: 0.5,
        z: 0.5,
        duration: 0.8,
        ease: "power2.in",
      });
    }

    // Cacher le texte
    if (this.textElement) {
      gsap.to(this.textElement, {
        opacity: 0,
        x: "-=100",
        duration: 0.5,
        ease: "power2.in",
      });
    }

    // Arrêter l'animation de rebond si elle est active
    this.isRebounding = false;

    // Cacher l'effet de shader
    if (this.floorShaderMaterial) {
      gsap.to(this.floorShaderMaterial.uniforms.bounceIntensity, {
        value: 0,
        duration: 0.3,
      });
    }
  }

  private showSceneElements(): void {
    // Ramener le ballon à sa position
    if (this.model) {
      gsap.to(this.model.position, {
        x: -3,
        duration: 0.8,
        ease: "power2.out",
      });

      gsap.to(this.model.scale, {
        x: 1.0,
        y: 1.0,
        z: 1.0,
        duration: 0.8,
        ease: "power2.out",
      });
    }

    // Montrer le texte
    if (this.textElement) {
      gsap.to(this.textElement, {
        opacity: 1,
        x: "+=100",
        duration: 0.8,
        ease: "power2.out",
      });
    }

    // Réactiver l'animation de rebond
    this.isRebounding = true;
  }

  private createHeadingElement(): void {
    this.textElement = document.createElement("h2");
    this.textElement.textContent = "YOU JUST NEED A BALL";
    this.textElement.style.position = "absolute";
    this.textElement.style.left = "20%";
    this.textElement.style.top = "40%";
    this.textElement.style.transform = "translateY(-50%)";
    this.textElement.style.color = "white";
    this.textElement.style.fontSize = "3rem";
    this.textElement.style.opacity = "0";
    this.textElement.style.zIndex = "100";
    this.textElement.style.color = "#9e370d";
    document.body.appendChild(this.textElement);
  }

  private setupBallAnimation(): void {
    if (!this.model) return;

    this.isAnimationActive = true;

    // Créer le sol avec shader avant l'animation
    this.createFloor();

    gsap
      .timeline()
      .to(this.model.position, {
        z: -10,
        duration: 1.5,
        ease: "power2.in",
      })
      .to(this.model.position, {
        z: -0.5,
        x: -3,
        duration: 1.5,
        ease: "bounce.out",
      })
      .to(
        this.model.scale,
        {
          x: 1.0,
          y: 1.0,
          z: 1.0,
          duration: 0.8,
          ease: "power2.out",
        },
        "-=1.5"
      )
      .to(
        this.textElement!,
        {
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
        },
        "-=0.5"
      )
      .call(() => {
        // Commencer l'animation de rebond
        this.startReboundAnimation();

        // Notifier que l'animation du ballon est terminée
        const event = new CustomEvent("ballAnimationComplete");
        document.dispatchEvent(event);
      });
  }

  public async load(): Promise<void> {
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync("/basketball.glb");
      this.model = gltf.scene;
      this.model.scale.set(3.5, 3.5, 3.5);
      this.model.position.set(0, 0, 0);
      this.add(this.model);
    } catch (error) {
      console.error("Erreur lors du chargement du modèle:", error);
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

    // Nettoyer le sol
    if (this.floor) {
      if (this.floor.geometry) this.floor.geometry.dispose();
      if (this.floor.material) {
        if (Array.isArray(this.floor.material)) {
          this.floor.material.forEach((mat) => mat.dispose());
        } else {
          this.floor.material.dispose();
        }
      }
    }

    // Nettoyer le texte
    if (this.textElement && this.textElement.parentNode) {
      this.textElement.parentNode.removeChild(this.textElement);
    }

    // Nettoyer les triggers
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

    // Réactiver les interactions souris si elles ont été désactivées
    document.body.style.pointerEvents = "auto";
  }

  private animateBallRebound(): void {
    if (!this.model || !this.isRebounding) return;

    const deltaTime = this.clock.delta / 1000;
    this.timeSinceLastBounce += deltaTime;

    // Période de rebond en secondes
    const bouncePeriod = 1.5;

    // Hauteur maximale du rebond
    const maxHeight = 1.5;

    // Calculer la hauteur du rebond avec effet de ressort amorti
    const t = (this.timeSinceLastBounce % bouncePeriod) / bouncePeriod;
    const amplitude = Math.max(
      0.05,
      1 - Math.floor(this.timeSinceLastBounce / bouncePeriod) * 0.1
    );

    // Fonction de rebond
    const height = Math.abs(Math.sin(t * Math.PI)) * maxHeight * amplitude;

    // Position précédente pour détecter le changement de direction
    const previousY = this.model.position.y;

    // Appliquer la hauteur
    this.model.position.y = this.reboundStartPosition.y + height;

    // Détecter le moment EXACT du rebond - quand la hauteur est proche de zéro
    // et que le ballon va vers le haut (changement de direction)
    const currentHeight = height;
    const isNearBottom = currentHeight < 0.05;
    const isMovingUp = this.model.position.y > previousY;

    if (isNearBottom && isMovingUp) {
      const currentTime = Date.now();

      // Éviter les rebonds multiples avec un court délai
      if (currentTime - this.lastBounceTime > 50) {
        this.triggerFloorIllumination();
        this.lastBounceTime = currentTime;
      }
    }
  }

  private createFloor(): void {
    // Créer un shader material pour le sol qui réagira aux rebonds
    const floorShaderMaterial = new ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        bounceIntensity: { value: 0.0 },
        bouncePosition: { value: new Vector3(0, 0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float bounceIntensity;
        uniform vec3 bouncePosition;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // Distance du point d'impact
          float dist = distance(vec3(vPosition.x, 0.0, vPosition.z), vec3(bouncePosition.x, 0.0, bouncePosition.z));
          
          // Effet d'ondulations concentriques
          float ring1 = smoothstep(0.05, 0.0, abs(dist - time * 2.0));
          float ring2 = smoothstep(0.05, 0.0, abs(dist - time * 2.0 - 0.4));
          float ring3 = smoothstep(0.05, 0.0, abs(dist - time * 2.0 - 0.8));
          
          // Combiner les anneaux
          float rings = max(ring1, max(ring2, ring3)) * 0.5;
          
          // Cercle central s'estompant avec la distance
          float center = smoothstep(2.5, 0.0, dist) * 0.7; // Augmenté de 1.0 à 2.5
          
          // Luminosité finale
          float brightness = (center + rings) * bounceIntensity;
          
          // Couleur bleue (au lieu de blanche)
          vec3 color = vec3(1.0, 1.0, 1.0) * brightness;
          
          // Alpha basé sur l'intensité et diminuant avec la distance - augmentation de la visibilité
          float alpha = min(1.0, brightness * 2.0) * smoothstep(3.0, 0.0, dist); // Augmenté de 1.5 à 3.0
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    // Créer un plan plus grand pour l'effet d'impact
    const floorGeometry = new PlaneGeometry(6, 6, 32, 32); // Augmenté de 3,3 à 6,6
    const floor = new Mesh(floorGeometry, floorShaderMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.05;
    floor.position.x = -1;
    floor.renderOrder = 999;

    // Initialement invisible
    floorShaderMaterial.uniforms.bounceIntensity.value = 0.0;

    this.add(floor);
    this.floor = floor;
    this.floorShaderMaterial = floorShaderMaterial;
  }
  private triggerFloorIllumination(): void {
    if (!this.floorShaderMaterial || !this.model || !this.floor) return;

    // S'assurer que le plan est positionné sous le ballon
    //this.floor.position.x = this.model.position.x;
    this.floor.position.z = this.model.position.z;

    // Mettre à jour l'intensité du rebond dans le shader avec une valeur plus élevée
    this.floorShaderMaterial.uniforms.bounceIntensity.value = 3.0; // Augmenté encore plus pour visibilité maximale

    // Remettre à zéro le temps pour avoir l'animation depuis le début
    this.floorShaderMaterial.uniforms.time.value = 0.0;

    // Mettre à jour la position du rebond
    this.floorShaderMaterial.uniforms.bouncePosition.value.copy(
      this.model.position
    );

    // Animation pour diminuer progressivement l'intensité, mais plus lentement
    gsap.to(this.floorShaderMaterial.uniforms.bounceIntensity, {
      value: 0,
      duration: 1.2, // Légèrement plus long pour être plus visible
      ease: "power1.out", // Changé pour une décroissance plus linéaire
    });
  }

  // Assurons-nous également que l'update est correctement configuré
  public update(): void {
    this.light1.position.copy(this.camera.position);

    // Mettre à jour le temps dans le shader
    if (this.floorShaderMaterial) {
      this.floorShaderMaterial.uniforms.time.value += this.clock.delta * 0.001;
    }

    // Appeler l'animation de rebond si active
    if (this.isAnimationActive && this.isRebounding) {
      this.animateBallRebound();
    } else if (this.model && !this.isAnimationActive) {
      this.model.rotation.y += 0.0002 * this.clock.delta;
    }
  }

  // Assurons-nous que la fonction startReboundAnimation initialise correctement les variables
  private startReboundAnimation(): void {
    if (!this.model) return;

    // Enregistrer la position de repos
    this.reboundStartPosition.copy(this.model.position);

    // Commencer l'animation de rebond
    this.isRebounding = true;
    this.timeSinceLastBounce = 0;

    // Réinitialiser le shader
    if (this.floorShaderMaterial) {
      this.floorShaderMaterial.uniforms.bounceIntensity.value = 0.0;
      this.floorShaderMaterial.uniforms.time.value = 0.0;
    }

    // Désactiver les interactions souris
    document.body.style.pointerEvents = "none";
  }
}
