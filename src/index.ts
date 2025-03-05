import { App } from "~/App";
import gsap from "gsap";
import { eventBus } from "./utils/EventBus";

// Wait for full page load
window.addEventListener("load", async () => {
  try {
    // Mount the app
    await App.mount({
      debug: true,
      canvas: document.querySelector("canvas")!,
    });

    // Add loaded class to body
    document.body.classList.add("loaded");

    const glassTitle = document.querySelector(".glass-title") as HTMLElement;

    if (glassTitle) {
      let scale = 1;
      const maxScale = 6;
      const minScale = 1;
      let isScreenBroken = false;

      // Conteneur pour les fissures
      const cracksContainer = document.createElement("div");
      cracksContainer.id = "cracks-container";
      Object.assign(cracksContainer.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        zIndex: "9999",
        pointerEvents: "none",
        opacity: "0",
      });
      document.body.appendChild(cracksContainer);

      const sensitivity = 0.0005;
      window.addEventListener("wheel", (event) => {
        // Mettre à jour l'échelle avec le défilement
        scale += sensitivity * event.deltaY;
        scale = Math.max(minScale, Math.min(scale, maxScale));

        // Mettre à jour la transformation du titre
        glassTitle.style.transform = `
          translate(-50%, -50%) 
          scale(${scale})
        `;

        // Déclencher l'effet d'écran cassé uniquement quand le zoom maximum est atteint
        if (scale >= maxScale && !isScreenBroken) {
          // Activer l'effet d'écran cassé
          isScreenBroken = true;

          // Créer l'effet d'écran cassé
          createGlassBreakEffect(cracksContainer, glassTitle);

          // Faire disparaître le titre
          gsap.to(glassTitle, {
            opacity: 0,
            duration: 0.5,
            ease: "power2.in",
          });
        }
        // Faire réapparaître le titre si on dézoome suffisamment et que l'écran était cassé
        else if (scale < maxScale - 0.5 && isScreenBroken) {
          isScreenBroken = false;

          gsap.to(cracksContainer, {
            opacity: 0,
            duration: 1,
            onComplete: () => {
              cracksContainer.innerHTML = "";
            },
          });

          // Faire réapparaître le titre
          gsap.to(glassTitle, {
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
          });
        }
      });
    }
  } catch (error) {
    console.error("App initialization failed:", error);
  }
});

function createGlassBreakEffect(
  container: HTMLElement,
  titleElement: HTMLElement
) {
  // Vider le conteneur au cas où
  container.innerHTML = "";

  // Position du point d'impact (centre du titre)
  const rect = titleElement.getBoundingClientRect();
  const impactX = rect.left + rect.width / 2;
  const impactY = rect.top + rect.height / 2;

  // Créer l'épicentre (point d'impact)
  const epicenter = document.createElement("div");
  epicenter.className = "crack-epicenter";
  Object.assign(epicenter.style, {
    position: "absolute",
    top: `${impactY}px`,
    left: `${impactX}px`,
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: "white",
    boxShadow: "0 0 20px 5px rgba(255, 255, 255, 0.8)",
    transform: "translate(-50%, -50%)",
    zIndex: "10000",
  });
  container.appendChild(epicenter);

  // Créer plusieurs séries de fissures pour couvrir tout l'écran
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // Points d'impact additionnels pour couvrir tout l'écran
  const impactPoints = [
    { x: impactX, y: impactY }, // Point d'impact principal
    { x: 0, y: 0 }, // Coin supérieur gauche
    { x: screenWidth, y: 0 }, // Coin supérieur droit
    { x: 0, y: screenHeight }, // Coin inférieur gauche
    { x: screenWidth, y: screenHeight }, // Coin inférieur droit
    { x: screenWidth / 2, y: 0 }, // Milieu haut
    { x: screenWidth / 2, y: screenHeight }, // Milieu bas
    { x: 0, y: screenHeight / 2 }, // Milieu gauche
    { x: screenWidth, y: screenHeight / 2 }, // Milieu droit
  ];

  // Créer des fissures à partir de chaque point d'impact avec un délai croissant
  impactPoints.forEach((point, index) => {
    const delay = index * 0.1; // Délai pour l'effet de propagation

    setTimeout(() => {
      if (index === 0) {
        // Pour le point d'impact principal, créer plus de fissures
        createMainCracks(container, point.x, point.y, 8, 400); // Plus de fissures principales
        createSecondaryCracks(container, point.x, point.y, 15); // Plus de fissures secondaires
      } else {
        // Pour les points secondaires, créer moins de fissures
        createMainCracks(container, point.x, point.y, 4, 300); // Moins de fissures principales
        createSecondaryCracks(container, point.x, point.y, 8); // Moins de fissures secondaires
      }
    }, delay * 1000);
  });

  // Ajouter des particules de verre depuis le point d'impact principal
  createGlassParticles(container, impactX, impactY, 20); // Plus de particules

  // Ajouter un overlay semi-transparent pour l'effet LCD endommagé
  const lcdOverlay = document.createElement("div");
  lcdOverlay.className = "lcd-damage-overlay";
  Object.assign(lcdOverlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    background:
      "radial-gradient(circle at " +
      impactX +
      "px " +
      impactY +
      "px, rgba(0,0,0,0) 40px, rgba(100,100,100,0.1) 80px)",
    backdropFilter: "contrast(1.05) brightness(0.95)",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "9990",
  });
  container.appendChild(lcdOverlay);

  // Animation de l'effet
  gsap
    .timeline()
    // Faire apparaître l'épicentre
    .to(epicenter, {
      opacity: 1,
      duration: 0.1,
    })
    // Faire disparaître progressivement l'épicentre
    .to(epicenter, {
      opacity: 0,
      scale: 2,
      duration: 0.5,
      delay: 0.1,
    })
    // Faire apparaître l'overlay LCD endommagé
    .to(
      lcdOverlay,
      {
        opacity: 1,
        duration: 0.3,
      },
      0.1
    );

  // Animation globale du conteneur
  gsap.to(container, {
    opacity: 1,
    duration: 0.2,
  });

  // Faire disparaître l'effet après 2 secondes
  setTimeout(() => {
    gsap.to(container, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        container.innerHTML = "";

        eventBus.emit("glassBreakComplete");
      },
    });
  }, 2000);
}

// Fonction pour créer les fissures principales
function createMainCracks(
  container: HTMLElement,
  centerX: number,
  centerY: number,
  numCracks = 6, // Paramètre par défaut ajouté
  maxLength = 300 // Paramètre par défaut ajouté
) {
  for (let i = 0; i < numCracks; i++) {
    // Angle aléatoire pour chaque fissure
    const angle = (Math.PI * 2 * i) / numCracks + (Math.random() * 0.3 - 0.15);

    // Créer la fissure principale
    createCrack({
      container,
      startX: centerX,
      startY: centerY,
      angle,
      length: 100 + Math.random() * maxLength, // Longueur aléatoire avec paramètre maxLength
      width: 2 + Math.random() * 2,
      segments: 4 + Math.floor(Math.random() * 3),
      delay: i * 0.05,
      duration: 0.2 + Math.random() * 0.3,
      isMain: true,
    });
  }
}

// Fonction pour créer des fissures secondaires
function createSecondaryCracks(
  container: HTMLElement,
  centerX: number,
  centerY: number,
  numCracks = 10 // Paramètre par défaut ajouté
) {
  for (let i = 0; i < numCracks; i++) {
    // Position de départ aléatoire autour du centre
    const distance = 20 + Math.random() * 80;
    const startAngle = Math.random() * Math.PI * 2;
    const startX = centerX + Math.cos(startAngle) * distance;
    const startY = centerY + Math.sin(startAngle) * distance;

    // Angle aléatoire dans toutes les directions
    const angle = Math.random() * Math.PI * 2;

    // Créer la fissure secondaire
    createCrack({
      container,
      startX,
      startY,
      angle,
      length: 30 + Math.random() * 120,
      width: 1 + Math.random(),
      segments: 2 + Math.floor(Math.random() * 3),
      delay: 0.2 + i * 0.04,
      duration: 0.1 + Math.random() * 0.2,
      isMain: false,
    });
  }
}

// Fonction pour créer une fissure individuelle
interface CrackParams {
  container: HTMLElement;
  startX: number;
  startY: number;
  angle: number;
  length: number;
  width: number;
  segments: number;
  delay: number;
  duration: number;
  isMain: boolean;
}

function createCrack(params: CrackParams) {
  const {
    container,
    startX,
    startY,
    angle,
    length,
    width,
    segments,
    delay,
    duration,
    isMain,
  } = params;

  // Calculs des points de contrôle pour créer une fissure réaliste
  let currentX = startX;
  let currentY = startY;
  let currentAngle = angle;
  let remainingLength = length;

  for (let i = 0; i < segments; i++) {
    // Calculer la longueur de ce segment
    const segmentLength = remainingLength / (segments - i);
    remainingLength -= segmentLength;

    // Calculer la légère variation d'angle pour ce segment
    const angleVariation = isMain
      ? Math.random() * 0.4 - 0.2
      : Math.random() * 0.8 - 0.4;
    currentAngle += angleVariation;

    // Calculer le point d'arrivée de ce segment
    const endX = currentX + Math.cos(currentAngle) * segmentLength;
    const endY = currentY + Math.sin(currentAngle) * segmentLength;

    // Créer l'élément de fissure
    const crack = document.createElement("div");
    crack.className = isMain ? "crack main" : "crack secondary";
    container.appendChild(crack);

    // Calculer l'angle en degrés pour CSS
    const rotateDeg = (currentAngle * 180) / Math.PI;

    // Appliquer les styles
    Object.assign(crack.style, {
      position: "absolute",
      top: `${currentY}px`,
      left: `${currentX}px`,
      width: `${segmentLength}px`,
      height: `${width}px`,
      background: `linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,255,255,${
        isMain ? 0.4 : 0.3
      }))`,
      borderRadius: `${width}px`,
      boxShadow: isMain
        ? `0 0 5px rgba(255,255,255,0.7), 0 0 2px rgba(255,255,255,0.9)`
        : `0 0 3px rgba(255,255,255,0.5)`,
      transformOrigin: "left center",
      transform: `rotate(${rotateDeg}deg)`,
      opacity: "0",
      zIndex: isMain ? "9995" : "9994",
    });

    // Animation pour faire apparaître la fissure
    gsap.to(crack, {
      opacity: isMain ? 1 : 0.8,
      duration,
      delay: delay + i * 0.03,
      ease: "power1.out",
    });

    // Préparer pour le prochain segment
    currentX = endX;
    currentY = endY;
  }

  // Possibilité de créer des branchements pour les fissures principales
  if (isMain && Math.random() > 0.5) {
    const branchX = startX + (currentX - startX) * (0.3 + Math.random() * 0.4);
    const branchY = startY + (currentY - startY) * (0.3 + Math.random() * 0.4);

    createCrack({
      container,
      startX: branchX,
      startY: branchY,
      angle: angle + (Math.random() * 1.2 - 0.6),
      length: length * (0.3 + Math.random() * 0.3),
      width: width * 0.7,
      segments: segments - 1,
      delay: delay + 0.1,
      duration: duration * 0.8,
      isMain: false,
    });
  }
}

// Fonction pour créer des particules de verre
function createGlassParticles(
  container: HTMLElement,
  centerX: number,
  centerY: number,
  numParticles = 12 // Paramètre par défaut ajouté
) {
  for (let i = 0; i < numParticles; i++) {
    const particle = document.createElement("div");
    particle.className = "glass-particle";
    container.appendChild(particle);

    // Taille aléatoire
    const size = 3 + Math.random() * 7;

    // Styles pour les particules
    Object.assign(particle.style, {
      position: "absolute",
      top: `${centerY}px`,
      left: `${centerX}px`,
      width: `${size}px`,
      height: `${size}px`,
      background: "rgba(255, 255, 255, 0.8)",
      boxShadow: "0 0 5px rgba(255, 255, 255, 0.7)",
      borderRadius: "2px",
      transform: "translate(-50%, -50%)",
      opacity: "0",
      zIndex: "9996",
    });

    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 150;

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 1,
      duration: 0.2,
      delay: 0.1 + Math.random() * 0.1,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(particle, {
          opacity: 0,
          duration: 0.5,
          delay: 0.5 + Math.random() * 0.5,
        });
      },
    });
  }
}
