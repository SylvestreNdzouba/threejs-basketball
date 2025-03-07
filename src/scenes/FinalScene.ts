import {
  Scene,
  Mesh,
  PerspectiveCamera,
  Group,
  DirectionalLight,
  AmbientLight,
  Vector3,
  SphereGeometry,
  Raycaster,
  Vector2,
  Material,
  MeshBasicMaterial,
} from "three";

import { ShaderMaterial, DoubleSide, Color } from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";

import type { Viewport, Clock, Lifecycle } from "~/core";

export interface FinalSceneParameters {
  clock: Clock;
  camera: PerspectiveCamera;
  viewport: Viewport;
}

export class FinalScene extends Scene implements Lifecycle {
  public clock: Clock;
  public camera: PerspectiveCamera;
  public viewport: Viewport;
  public light: DirectionalLight;
  private isVisible: boolean = false;
  private textElement?: HTMLElement;
  private messageElement?: HTMLElement;
  private basketball?: Group;
  private raycaster: Raycaster;
  private mouse: Vector2;
  private boundClickHandler: (event: MouseEvent) => void;
  private balloonDeflated: boolean = false;
  private balloonShaderMaterial?: ShaderMaterial;

  public constructor({ clock, camera, viewport }: FinalSceneParameters) {
    super();

    this.clock = clock;
    this.camera = camera;
    this.viewport = viewport;

    this.raycaster = new Raycaster();
    this.mouse = new Vector2();

    // Créer des lumières
    this.light = new DirectionalLight(0xffffff, 1);
    this.light.position.set(0, 5, 0);
    this.add(this.light);

    const ambientLight = new AmbientLight(0xffffff, 0.8);
    this.add(ambientLight);

    // Créer l'élément de texte
    this.createTextElement();

    // Créer l'élément de message (initialement caché)
    this.createMessageElement();

    // Configurer l'écouteur de clic
    this.boundClickHandler = this.onMouseClick.bind(this);
    window.addEventListener("click", this.boundClickHandler);

    // Écouter l'événement de fin de rotation de l'arène
    document.addEventListener("arenaRotationComplete", () => {
      this.showScene();
    });

    // Par défaut, cette scène est invisible
    this.visible = false;
  }

  private createTextElement(): void {
    this.textElement = document.createElement("h2");
    this.textElement.textContent = "SHOW ME YOUR SKILLS";
    this.textElement.style.position = "absolute";
    this.textElement.style.left = "50%";
    this.textElement.style.top = "15%";
    this.textElement.style.transform = "translateX(-50%)";
    this.textElement.style.color = "#ffffff";
    this.textElement.style.fontSize = "3rem";
    this.textElement.style.fontWeight = "bold";
    this.textElement.style.textAlign = "center";
    this.textElement.style.opacity = "0"; // Caché au début
    this.textElement.style.zIndex = "100";
    this.textElement.style.textShadow = "0 0 10px rgba(0,0,0,0.5)";
    document.body.appendChild(this.textElement);
  }

  private createMessageElement(): void {
    this.messageElement = document.createElement("h3");
    this.messageElement.textContent =
      "What did this beautiful ball ever do to you...";
    this.messageElement.style.position = "absolute";
    this.messageElement.style.left = "50%";
    this.messageElement.style.top = "60%";
    this.messageElement.style.transform = "translateX(-50%)";
    this.messageElement.style.color = "#ff3300";
    this.messageElement.style.fontSize = "2.5rem";
    this.messageElement.style.fontWeight = "bold";
    this.messageElement.style.textAlign = "center";
    this.messageElement.style.opacity = "0"; // Caché au début
    this.messageElement.style.zIndex = "100";
    this.messageElement.style.textShadow = "0 0 10px rgba(0,0,0,0.5)";
    document.body.appendChild(this.messageElement);
  }

  private onMouseClick(event: MouseEvent): void {
    // Ne pas réagir si la scène n'est pas visible ou si le ballon est déjà dégonflé
    if (!this.isVisible || !this.basketball || this.balloonDeflated) return;

    // Calculer la position normalisée de la souris
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Mettre à jour le raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Vérifier si le clic a touché le ballon
    const intersects = this.raycaster.intersectObject(this.basketball, true);

    if (intersects.length > 0) {
      this.deflateBalloon();
    }
  }

  private showScene(): void {
    console.log("FinalScene: méthode showScene appelée");
    this.isVisible = true;
    this.visible = true;

    // Masquer explicitement l'ArenaScene
    const arenaSceneElement = document.querySelector(".arena-scene");
    if (arenaSceneElement) {
      arenaSceneElement.classList.add("hidden");
    }

    const hideArenaEvent = new CustomEvent("hideArenaScene", { detail: true });
    document.dispatchEvent(hideArenaEvent);

    // Masquer spécifiquement le titre d'ArenaScene
    // Sélectionner le titre de l'ArenaScene avec le texte spécifique
    const arenaTitle = Array.from(document.querySelectorAll("h2")).find(
      (el) => el.textContent === "THE BIGGEST STADIUM"
    );
    if (arenaTitle) {
      arenaTitle.style.opacity = "0";
      arenaTitle.style.display = "none";
    }

    // Réinitialiser la position de la caméra pour cette scène
    gsap.to(this.camera.position, {
      x: 0,
      y: 1,
      z: 5,
      duration: 1.0,
      ease: "power2.inOut",
      onComplete: () => {
        console.log("Caméra repositionnée pour FinalScene");
      },
    });

    // Orienter la caméra vers le centre
    this.camera.lookAt(new Vector3(0, 0, 0));

    // Animer l'apparition du texte
    gsap.to(this.textElement!, {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    });

    // Animation du ballon si présent
    if (this.basketball && !this.balloonDeflated) {
      // Placer le ballon au centre
      this.basketball.position.set(0, 0, 0);

      // Animation de rebondissement
      gsap.to(this.basketball.position, {
        y: 0.5,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });

      // Animation de rotation
      gsap.to(this.basketball.rotation, {
        y: Math.PI * 2,
        duration: 4,
        repeat: -1,
        ease: "none",
      });
    }

    if (this.basketball && !this.balloonDeflated) {
      // Placer le ballon au centre
      this.basketball.position.set(0, 0, 0);

      // Remplacer l'animation de rebondissement par un mouvement aléatoire
      this.startRandomBallMovement();

      // Animation de rotation
      gsap.to(this.basketball.rotation, {
        y: Math.PI * 2,
        duration: 4,
        repeat: -1,
        ease: "none",
      });
    }
  }

  // Modifier la méthode startRandomBallMovement pour un déplacement plus rapide et plus ample

  private startRandomBallMovement(): void {
    if (!this.basketball || this.balloonDeflated) return;

    // Nettoyer toute animation existante
    gsap.killTweensOf(this.basketball.position);
    gsap.killTweensOf(this.basketball.rotation);

    // Limites de mouvement - AUGMENTER L'AMPLITUDE
    const limits = {
      x: { min: -3.5, max: 3.5 }, // Élargi
      y: { min: -1.5, max: 2.5 }, // Élargi
      z: { min: -4, max: 1 }, // Élargi
    };

    // Suivi de la position et direction actuelles
    let currentPosition = {
      x: this.basketball.position.x,
      y: this.basketball.position.y,
      z: this.basketball.position.z,
    };

    // Fonction pour générer une position aléatoire - AUGMENTER LA DISTANCE
    const getRandomPosition = () => {
      // Distance maximale de déplacement par mouvement - AUGMENTÉE
      const maxDistance = 2.5; // Valeur augmentée (était 1.0)

      // Parfois, faire un grand saut aléatoire pour surprendre l'utilisateur
      const makeBigJump = Math.random() < 0.2; // 20% de chance de faire un grand saut

      // Générer un déplacement aléatoire limité en distance
      let dx, dy, dz;

      if (makeBigJump) {
        // Grand saut imprévisible
        dx = (Math.random() * 2 - 1) * maxDistance * 1.5;
        dy = (Math.random() * 2 - 1) * maxDistance * 1.5;
        dz = (Math.random() * 2 - 1) * maxDistance * 0.8;
      } else {
        // Mouvement normal mais plus ample qu'avant
        dx = (Math.random() * 2 - 1) * maxDistance;
        dy = (Math.random() * 2 - 1) * maxDistance;
        dz = (Math.random() * 2 - 1) * maxDistance * 0.7;
      }

      // Calculer la nouvelle position
      let newX = currentPosition.x + dx;
      let newY = currentPosition.y + dy;
      let newZ = currentPosition.z + dz;

      // S'assurer que la nouvelle position reste dans les limites
      newX = Math.max(limits.x.min, Math.min(limits.x.max, newX));
      newY = Math.max(limits.y.min, Math.min(limits.y.max, newY));
      newZ = Math.max(limits.z.min, Math.min(limits.z.max, newZ));

      // Mettre à jour la position actuelle
      currentPosition = { x: newX, y: newY, z: newZ };

      return currentPosition;
    };

    // Animation continue avec timeline GSAP
    const createMovementTimeline = () => {
      if (!this.basketball || this.balloonDeflated) return;

      // Créer une timeline pour séquencer les mouvements
      const timeline = gsap.timeline({
        onComplete: () => {
          if (!this.balloonDeflated) {
            createMovementTimeline(); // Créer une nouvelle timeline après la fin
          }
        },
      });

      // Nombre de points intermédiaires dans la séquence - MOINS DE POINTS POUR DES MOUVEMENTS PLUS DIRECTS
      const steps = 2 + Math.floor(Math.random() * 2); // 2 à 3 points par séquence (était 3 à 5)

      // Durée totale de cette séquence - PLUS RAPIDE
      const sequenceDuration = 1.5 + Math.random() * 1.5; // 1.5 à 3.0 secondes (était 2.5 à 4.5)

      // Durée par étape
      const stepDuration = sequenceDuration / steps;

      // Créer chaque étape de mouvement
      for (let i = 0; i < steps; i++) {
        const newPos = getRandomPosition();

        // Choisir un type d'easing aléatoire pour des mouvements plus imprévisibles
        const easings = [
          "power1.inOut",
          "power2.out",
          "back.out(1.2)", // Ajout d'un effet de "rebond" à la fin
          "circ.out", // Accélération rapide puis ralentissement
          "sine.inOut",
        ];
        const ease = easings[Math.floor(Math.random() * easings.length)];

        // Ajouter le mouvement à la timeline
        timeline.to(
          this.basketball.position,
          {
            x: newPos.x,
            y: newPos.y,
            z: newPos.z,
            duration: stepDuration,
            ease: ease,
            onUpdate: () => {
              // Mise à jour de currentPosition pour suivre le mouvement réel
              if (this.basketball) {
                currentPosition.x = this.basketball.position.x;
                currentPosition.y = this.basketball.position.y;
                currentPosition.z = this.basketball.position.z;
              }
            },
          },
          i > 0 ? ">" : 0
        );

        // Ajouter une rotation légère synchronisée - PLUS AMPLE
        timeline.to(
          this.basketball.rotation,
          {
            x: Math.random() * 0.8 - 0.4, // Rotations plus amples (était 0.4-0.2)
            z: Math.random() * 0.8 - 0.4, // Rotations plus amples
            duration: stepDuration * 0.7, // Plus rapide
            ease: "sine.inOut",
          },
          i > 0 ? ">" : 0
        );
      }

      return timeline;
    };

    // Animation continue de rotation y - PLUS RAPIDE
    gsap.to(this.basketball.rotation, {
      y: Math.PI * 2,
      duration: 2.5, // Plus rapide (était 4)
      repeat: -1,
      ease: "none",
    });

    // Démarrer la séquence de mouvements
    createMovementTimeline();
  }

  public async load(): Promise<void> {
    const loader = new GLTFLoader();

    try {
      const gltf = await loader.loadAsync("./public/basketball.glb");
      this.basketball = gltf.scene;

      // Ajuster l'échelle du ballon
      this.basketball.scale.set(1, 1, 1);

      // Positionner le ballon au centre
      this.basketball.position.set(0, 0, 0);

      // Créer le shader matériau pour le dégonflement
      this.createDeflateShaderMaterial();

      // Remplacer tous les matériaux du ballon par le shader personnalisé
      this.basketball.traverse((child) => {
        if (child instanceof Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (this.balloonShaderMaterial) {
            // Sauvegarder l'ancien matériau dans une propriété personnalisée
            (child as any).originalMaterial = child.material;
            // Appliquer le nouveau shader matériau
            child.material = this.balloonShaderMaterial;
          }
        }
      });

      this.add(this.basketball);
      console.log("Basketball loaded successfully in FinalScene");
    } catch (error) {
      console.error(
        "Erreur lors du chargement du modèle de basketball:",
        error
      );
    }
  }

  private createDeflateShaderMaterial(): void {
    const ballColor = new Color(0xff6600); // Couleur orange du ballon

    // Vertex Shader avec des déformations plus prononcées
    const vertexShader = `
uniform float deflateAmount;
uniform vec3 centerPoint;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normal;
  vPosition = position;
  
  // Calculer la direction de dégonflement (vers le centre du ballon)
  vec3 deflateDirection = normalize(position - centerPoint);
  
  // AMPLIFIER la déformation selon la quantité de dégonflement
  vec3 newPosition = position - deflateDirection * deflateAmount * (length(position - centerPoint) * 1.5); // Amplifié
  
  // AMPLIFIER l'effet d'aplatissement vertical
  if (position.y > centerPoint.y) {
    newPosition.y -= deflateAmount * 0.5 * abs(position.y - centerPoint.y); // Amplifié
  } else if (position.y < centerPoint.y) {
    float floorEffect = min(1.0, abs(position.y - centerPoint.y) * 5.0);
    newPosition.y += deflateAmount * 0.2 * floorEffect; // Amplifié
  }
  
  // AMPLIFIER la déformation irrégulière
  float ripple = sin(position.x * 10.0 + position.y * 5.0 + position.z * 7.0) * 0.1; // Amplifié
  
  // AMPLIFIER les rides quand le ballon est dégonflé
  if (deflateAmount > 0.3) { // Commence plus tôt
    float creases = sin(position.x * 30.0) * sin(position.z * 25.0) * 0.2 * deflateAmount; // Amplifié
    newPosition += deflateDirection * (ripple + creases) * deflateAmount * 1.5; // Amplifié
  } else {
    newPosition += deflateDirection * ripple * deflateAmount;
  }
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

    // Fragment Shader amélioré
    const fragmentShader = `
      uniform vec3 color;
      uniform float deflateAmount;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        // Calcul d'éclairage simplifié
        vec3 light = normalize(vec3(0.5, 1.0, 0.8));
        float brightness = dot(vNormal, light) * 0.5 + 0.5;
        
        // Ajouter des rides lors du dégonflement
        float wrinkles = 0.0;
        if (deflateAmount > 0.1) {
          // Rides plus complexes et variables
          float noiseScale = 25.0 + deflateAmount * 100.0;
          wrinkles = sin(vPosition.x * noiseScale) * sin(vPosition.y * noiseScale) * sin(vPosition.z * noiseScale) * 0.5 * deflateAmount;
          
          // Ajouter un motif de plis supplémentaire pour plus de réalisme
          float creases = sin(vPosition.x * 50.0 + vPosition.y * 20.0) * 0.3 * deflateAmount;
          wrinkles = mix(wrinkles, creases, deflateAmount * 0.5);
        }
        
        // Assombrir le ballon en fonction du dégonflement et augmenter le contraste des rides
        vec3 finalColor = color * (brightness - wrinkles * 0.7);
        
        // Ajouter un léger assombrissement à l'ensemble pour montrer la perte d'énergie
        finalColor *= (1.0 - deflateAmount * 0.2);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Créer le matériau shader
    this.balloonShaderMaterial = new ShaderMaterial({
      uniforms: {
        color: { value: ballColor },
        deflateAmount: { value: 0.0 }, // 0 = pas dégonflé, 1 = complètement dégonflé
        centerPoint: { value: new Vector3(0, 0, 0) },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: DoubleSide,
    });
  }

  private createDeflateEffect(position: Vector3): void {
    // Créer un groupe pour l'effet
    const effectGroup = new Group();
    this.add(effectGroup);

    // Créer plusieurs petites particules
    const particleCount = 12;
    const particles: Mesh[] = [];

    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 0.15 + 0.05;
      const geometry = new SphereGeometry(size, 8, 8);
      const material = new MeshBasicMaterial({
        color: 0xffcc88,
        transparent: true,
        opacity: 0.7,
      });

      const particle = new Mesh(geometry, material);

      // Positionner la particule au centre du ballon
      particle.position.copy(position);

      // Ajouter au groupe
      effectGroup.add(particle);
      particles.push(particle);

      // Animer chaque particule
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.5;
      const speed = 0.5 + Math.random() * 1.0;

      gsap.to(particle.position, {
        x: position.x + Math.cos(angle) * radius,
        y: position.y + Math.sin(angle) * radius,
        z: position.z + (Math.random() - 0.5) * radius,
        duration: speed,
        ease: "power2.out",
      });

      gsap.to(particle.scale, {
        x: 0.1,
        y: 0.1,
        z: 0.1,
        duration: speed,
        ease: "power1.in",
      });

      gsap.to(material, {
        opacity: 0,
        duration: speed,
        ease: "power1.in",
        onComplete: () => {
          if (i === particleCount - 1) {
            // Supprimer tout le groupe une fois l'animation terminée
            this.remove(effectGroup);
            effectGroup.traverse((obj) => {
              if (obj instanceof Mesh) {
                obj.geometry.dispose();
                if (obj.material instanceof Material) {
                  obj.material.dispose();
                }
              }
            });
          }
        },
      });
    }
  }

  private verifyShaderApplication(): boolean {
    if (!this.basketball || !this.balloonShaderMaterial) return false;

    let shaderApplied = false;
    this.basketball.traverse((child) => {
      if (
        child instanceof Mesh &&
        child.material === this.balloonShaderMaterial
      ) {
        shaderApplied = true;
      }
    });

    console.log("Shader correctement appliqué au ballon:", shaderApplied);
    return shaderApplied;
  }

  // Modifier la méthode deflateBalloon() pour un effet plus dramatique
  private deflateBalloon(): void {
    console.log("deflateBalloon appelé");
    console.log("basketball existe:", !!this.basketball);
    console.log("balloonShaderMaterial existe:", !!this.balloonShaderMaterial);

    if (!this.verifyShaderApplication()) {
      console.error("Le shader n'est pas correctement appliqué au ballon");
      // Tentative de réappliquer le shader si nécessaire
      if (this.basketball && this.balloonShaderMaterial) {
        this.basketball.traverse((child) => {
          if (child instanceof Mesh) {
            child.material = this.balloonShaderMaterial;
          }
        });
      }
    }

    if (!this.basketball || !this.balloonShaderMaterial) return;

    this.balloonDeflated = true;

    this.createDeflateEffect(this.basketball!.position.clone());

    // Arrêter toutes les animations précédentes
    gsap.killTweensOf(this.basketball.position);
    gsap.killTweensOf(this.basketball.rotation);

    // AMPLIFIER l'effet de secousse initiale
    gsap.to(this.basketball.position, {
      x: "+=0.25", // Plus large
      y: "+=0.15", // Plus haut
      duration: 0.08, // Plus rapide
      ease: "power4.out",
      repeat: 5, // Plus de secousses
      yoyo: true,
      onComplete: () => {
        console.log("Animation de secousse terminée");
      },
    });

    // Ajouter une déformation subite initiale pour simuler l'éclatement
    gsap.to(this.balloonShaderMaterial.uniforms.deflateAmount, {
      value: 0.4, // Déformation initiale rapide à 40%
      duration: 0.2,
      ease: "power1.in",
      onUpdate: () => {
        this.balloonShaderMaterial!.needsUpdate = true;
      },
      onComplete: () => {
        console.log("Déformation initiale terminée");
        if (this.balloonShaderMaterial)
          gsap.to(this.balloonShaderMaterial.uniforms.deflateAmount, {
            value: 1.0,
            duration: 2.0,
            ease: "power2.out",
            onUpdate: () => {
              this.balloonShaderMaterial!.needsUpdate = true;

              // AMPLIFIER les micro-mouvements aléatoires
              if (this.basketball && Math.random() > 0.5) {
                // Plus fréquent
                this.basketball.position.x += Math.random() * 0.05 - 0.025; // Plus large
                this.basketball.position.z += Math.random() * 0.05 - 0.025; // Plus large

                // Ajouter des rotations aléatoires également
                this.basketball.rotation.x += Math.random() * 0.04 - 0.02;
                this.basketball.rotation.z += Math.random() * 0.04 - 0.02;
              }
            },
            onComplete: () => {
              gsap.to(this.messageElement!, {
                opacity: 1,
                duration: 0.8,
                ease: "power2.out",
              });
            },
          });
      },
    });

    // Effet de ballon qui tourne sur lui-même avant de tomber
    gsap.to(this.basketball.rotation, {
      x: Math.PI * (Math.random() > 0.5 ? 0.5 : -0.5), // Rotation aléatoire
      z: Math.PI * (Math.random() > 0.5 ? 0.5 : -0.5), // Rotation aléatoire
      duration: 1.0,
      ease: "power2.inOut",
    });

    // Faire tomber le ballon plus dramatiquement
    gsap.to(this.basketball.position, {
      y: -1,
      duration: 1.8, // Plus rapide
      ease: "power3.in",
      onUpdate: () => {
        // Simuler un effet de ballon qui zigzague en tombant
        if (this.basketball && this.basketball.position.y > -0.7) {
          this.basketball.position.x += Math.sin(Date.now() * 0.02) * 0.006; // Plus rapide et plus ample
          this.basketball.position.z += Math.cos(Date.now() * 0.018) * 0.005; // Plus rapide et plus ample
        }
      },
      onComplete: () => {
        // Petit rebond final très faible
        gsap.to(this.basketball!.position, {
          y: -0.92,
          duration: 0.3,
          ease: "power2.out",
          yoyo: true,
          repeat: 1,
          onComplete: () => console.log("Rebond final terminé"),
        });
      },
    });

    // AMPLIFIER l'écrasement au sol
    setTimeout(() => {
      gsap.to(this.basketball!.scale, {
        x: 0.18, // Un peu plus large
        y: 0.05, // Beaucoup plus plat
        z: 0.18, // Un peu plus large
        duration: 0.3,
        ease: "bounce.out", // Effet de rebond
      });

      // Déplacer le centre de déformation plus bas
      gsap.to(this.balloonShaderMaterial!.uniforms.centerPoint.value, {
        y: -0.25,
        duration: 0.3,
        ease: "power1.in",
      });
    }, 1800); // Plus tôt

    // Ajouter un effet de "spasme" final quand le ballon touche le sol
    setTimeout(() => {
      gsap.to(this.basketball!.rotation, {
        y: this.basketball!.rotation.y + (Math.random() * 0.2 - 0.1),
        x: Math.random() * 0.1 - 0.05,
        z: Math.random() * 0.1 - 0.05,
        duration: 0.2,
        repeat: 2,
        yoyo: true,
      });
    }, 1850);
  }

  public update(): void {
    // Mettre à jour la position de la lumière directionnelle pour suivre la caméra
    this.light.position.copy(this.camera.position);
  }

  public resize(): void {
    this.camera.aspect = this.viewport.ratio;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    window.removeEventListener("click", this.boundClickHandler);

    // Nettoyer le ballon
    if (this.basketball) {
      this.basketball.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    // Supprimer les éléments de texte
    if (this.textElement && this.textElement.parentNode) {
      this.textElement.parentNode.removeChild(this.textElement);
    }

    if (this.messageElement && this.messageElement.parentNode) {
      this.messageElement.parentNode.removeChild(this.messageElement);
    }
  }
}
