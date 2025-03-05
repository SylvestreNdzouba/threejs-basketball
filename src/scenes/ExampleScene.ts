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
  }

  private createHeadingElement(): void {
    this.textElement = document.createElement("h2");
    this.textElement.textContent = "LE BALLON LA BASE DE TOUT";
    this.textElement.style.position = "absolute";
    this.textElement.style.left = "10%";
    this.textElement.style.top = "40%";
    this.textElement.style.transform = "translateY(-50%)";
    this.textElement.style.color = "white";
    this.textElement.style.fontSize = "3rem";
    this.textElement.style.opacity = "0";
    this.textElement.style.zIndex = "100";
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
        x: -3, // Positionner à gauche plutôt qu'à droite
        duration: 1.5,
        ease: "bounce.out",
      })
      .to(
        this.model.scale,
        {
          x: 1.0, // Réduire la taille du ballon
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
        // Commencer l'animation de rebond une fois en position
        this.startReboundAnimation();
      });

    // Configurer ScrollTrigger pour les interactions futures au scroll
    this.setupScrollAnimation();
  }

  private setupScrollAnimation(): void {
    if (!this.model) return;

    // Supprimer l'ancienne ScrollTrigger si elle existe
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

    // Créer une nouvelle animation contrôlée par le scroll
    gsap.timeline({
      scrollTrigger: {
        trigger: "#canvas-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
          if (this.model && this.isAnimationActive) {
            // Gestion du retour en arrière
            if (self.direction === -1 && self.progress < 0.1) {
              // Si on scroll vers le haut et qu'on est presque en haut
              // Remettre le ballon au centre avec sa taille d'origine
              gsap.to(this.model.position, {
                x: 0,
                y: 0,
                z: 0,
                duration: 0.8,
                ease: "power2.inOut",
              });

              gsap.to(this.model.scale, {
                x: 3.5,
                y: 3.5,
                z: 3.5,
                duration: 0.8,
                ease: "power2.inOut",
              });

              // Faire disparaître le texte et le sol
              gsap.to(this.textElement!, {
                opacity: 0,
                duration: 0.5,
                ease: "power2.in",
              });

              if (this.floor) {
                gsap.to(this.floor.material, {
                  opacity: 0,
                  duration: 0.5,
                  ease: "power2.in",
                  onComplete: () => {
                    if (this.floor) {
                      this.remove(this.floor);
                      this.floor = undefined;
                    }
                  },
                });
              }

              // Arrêter l'animation de rebond
              this.isRebounding = false;

              // Réactiver les interactions souris
              document.body.style.pointerEvents = "auto";

              // Permettre à nouveau la rotation automatique
              if (self.progress < 0.05) {
                this.isAnimationActive = false;
              }
            }
          }
        },
      },
    });
  }

  public async load(): Promise<void> {
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync("./assets/models/basketball.glb");
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

    // Appliquer la hauteur
    this.model.position.y = this.reboundStartPosition.y + height;

    // Détecter un rebond (quand le ballon touche le sol)
    // Modifions cette condition pour capturer le moment exact du rebond
    if (t > 0.48 && t < 0.52) {
      const currentTime = Date.now();

      // Élargissons l'intervalle entre les rebonds pour s'assurer qu'il est détecté
      if (currentTime - this.lastBounceTime > 100) {
        console.log("Rebond détecté!"); // Ajout d'un log pour vérifier
        this.triggerFloorIllumination();
        this.lastBounceTime = currentTime;
      }
    }
  }

  // Modifier le fragment shader pour un effet plus visible
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
          float center = smoothstep(1.0, 0.0, dist) * 0.7;
          
          // Luminosité finale
          float brightness = (center + rings) * bounceIntensity;
          
          // Couleur bleue (au lieu de blanche)
          vec3 color = vec3(0.2, 0.6, 1.0) * brightness;
          
          // Alpha basé sur l'intensité et diminuant avec la distance - augmentation de la visibilité
          float alpha = min(1.0, brightness * 2.0) * smoothstep(1.5, 0.0, dist);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false, // Ajout important pour la visibilité en mode transparent
      depthTest: true,
    });

    // Créer un plan plus petit pour l'effet d'impact
    const floorGeometry = new PlaneGeometry(3, 3, 32, 32);
    const floor = new Mesh(floorGeometry, floorShaderMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.05; // Légèrement plus haut pour être mieux visible
    floor.renderOrder = 999; // Force le rendu après les autres objets

    // Initialement invisible
    floorShaderMaterial.uniforms.bounceIntensity.value = 0.0;

    this.add(floor);
    this.floor = floor;
    this.floorShaderMaterial = floorShaderMaterial;
  }

  private triggerFloorIllumination(): void {
    if (!this.floorShaderMaterial || !this.model || !this.floor) return;

    console.log("Illumination du sol!"); // Ajout d'un log pour vérifier

    // S'assurer que le plan est positionné sous le ballon
    this.floor.position.x = this.model.position.x;
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

    console.log("Début de l'animation de rebond");

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
