import { type WebGLRenderer, type Scene, type Camera } from "three";
import gsap from "gsap";
import {
  EffectComposer,
  FXAAEffect,
  EffectPass,
  RenderPass,
  BloomEffect,
  VignetteEffect,
} from "postprocessing";

import type { Clock, Viewport, Lifecycle } from "~/core";

export interface ComposerParameters {
  renderer: WebGLRenderer;
  viewport: Viewport;
  clock: Clock;
  scene?: Scene;
  camera?: Camera;
}

export class Composer extends EffectComposer implements Lifecycle {
  public clock: Clock;
  public viewport: Viewport;
  public renderPass: RenderPass;
  public effectPass?: EffectPass;
  public fxaaEffect?: FXAAEffect;
  public bloomEffect?: BloomEffect;
  public vignetteEffect?: VignetteEffect;
  public bloomPass?: EffectPass;
  public vignettePass?: EffectPass;

  public get camera(): Camera | undefined {
    return this.renderPass.mainCamera;
  }

  public constructor({
    renderer,
    viewport,
    clock,
    scene,
    camera,
  }: ComposerParameters) {
    super(renderer);
    this.clock = clock;
    this.viewport = viewport;
    this.renderPass = new RenderPass(scene, camera);
  }

  public async load(): Promise<void> {
    this.fxaaEffect = new FXAAEffect();
    this.effectPass = new EffectPass(this.camera, this.fxaaEffect);

    this.bloomEffect = new BloomEffect({
      intensity: 5, // Intensité du bloom
      luminanceThreshold: 0.1, // Seuil de luminance
      luminanceSmoothing: 0.9, // Lissage
      mipmapBlur: true,
    });

    // Effet Vignette pour un look de diffusion sportive
    this.vignetteEffect = new VignetteEffect({
      offset: 0.3, // Distance du centre
      darkness: 0.7, // Intensité de l'assombrissement
    });

    // Désactiver les effets au départ (ils seront activés quand HoopScene sera visible)
    this.bloomEffect.blendMode.opacity.value = 1;
    this.vignetteEffect.blendMode.opacity.value = 1;

    // Créer les passes pour chaque effet
    this.bloomPass = new EffectPass(this.camera, this.bloomEffect);
    this.vignettePass = new EffectPass(this.camera, this.vignetteEffect);

    this.addPass(this.renderPass);
    this.addPass(this.bloomPass);
    this.addPass(this.vignettePass);
    this.addPass(this.effectPass);

    this.setupEffectEvents();
  }

  public update(): void {}

  public resize(): void {
    this.getRenderer().setPixelRatio(this.viewport.dpr);
    this.setSize(this.viewport.size.x, this.viewport.size.y, false);
  }

  public render(): void {
    super.render(this.clock.delta / 1000);
  }

  private setupEffectEvents(): void {
    document.addEventListener("hoopSceneFullyScrolled", ((event: Event) => {
      const customEvent = event as CustomEvent;
      const isMaxScroll = customEvent.detail;

      if (isMaxScroll) {
        gsap.to(this.bloomEffect!.blendMode.opacity, {
          value: 1,
          duration: 0.5,
          ease: "power2.out",
        });

        gsap.to(this.vignetteEffect!.blendMode.opacity, {
          value: 1,
          duration: 0.5,
          ease: "power2.out",
        });

        if (this.bloomEffect) {
          const intensityUniform = this.bloomEffect.uniforms.get("intensity");
          if (intensityUniform !== undefined) {
            gsap.to(intensityUniform, {
              value: 2.0,
              duration: 0.5,
              ease: "power2.out",
            });
          }
        }
      } else {
        // Réduire l'intensité sans désactiver complètement
        gsap.to(this.bloomEffect!.blendMode.opacity, {
          value: 0.5, // Retour à la valeur initiale
          duration: 0.5,
          ease: "power2.in",
        });

        gsap.to(this.vignetteEffect!.blendMode.opacity, {
          value: 0.5, // Retour à la valeur initiale
          duration: 0.5,
          ease: "power2.in",
        });

        if (this.bloomEffect) {
          // Obtenir l'uniform d'intensité
          const intensityUniform = this.bloomEffect.uniforms.get("intensity");
          // Vérifier qu'il existe avant de l'animer
          if (intensityUniform !== undefined) {
            gsap.to(intensityUniform, {
              value: 1.25,
              duration: 0.5,
              ease: "power2.in",
            });
          }
        }
      }
    }) as EventListener);
  }
}
