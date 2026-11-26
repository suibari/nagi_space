/**
 * botたんの3Dモデル（BOT-05）。three.js と three-vrm は botたんが参加したときだけ読み込む。
 * 待機の動きを繰り返し、返事の動きのカテゴリを受けたらその動きを1回流す。口は声の大きさで動かす。
 */
export type BotManifest = { model: string; idle: string[]; motions: Record<string, string[]> };

export type Avatar = {
	playMotion(category: string): void;
	setMouth(level: number): void;
	dispose(): void;
};

/** WebGL が使えるか（使えなければアイコンで代わりに表示する）。 */
export function canUseWebGL(): boolean {
	try {
		const canvas = document.createElement('canvas');
		return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
	} catch {
		return false;
	}
}

export async function createAvatar(canvas: HTMLCanvasElement, base: string): Promise<Avatar> {
	const THREE = await import('three');
	const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
	const { VRMLoaderPlugin, VRMUtils } = await import('@pixiv/three-vrm');
	const { VRMAnimationLoaderPlugin, createVRMAnimationClip } =
		await import('@pixiv/three-vrm-animation');

	const url = (path: string) => `${base.replace(/\/$/, '')}/${path}`;
	const manifest = (await (await fetch(url('manifest.json'))).json()) as BotManifest;

	const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
	camera.position.set(0, 1.3, 2.4);
	camera.lookAt(0, 1.2, 0);
	scene.add(new THREE.AmbientLight(0xffffff, 1.6));
	const light = new THREE.DirectionalLight(0xffffff, 1.4);
	light.position.set(1, 2, 2);
	scene.add(light);

	const loader = new GLTFLoader();
	loader.register((parser) => new VRMLoaderPlugin(parser));
	loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
	const vrm = (await loader.loadAsync(url(manifest.model))).userData.vrm;
	VRMUtils.rotateVRM0(vrm);
	scene.add(vrm.scene);

	const mixer = new THREE.AnimationMixer(vrm.scene);
	const clips = new Map<string, import('three').AnimationClip>();
	async function clip(path: string) {
		if (!clips.has(path)) {
			const animation = (await loader.loadAsync(url(path))).userData.vrmAnimations?.[0];
			if (!animation) throw new Error(`no animation in ${path}`);
			clips.set(path, createVRMAnimationClip(animation, vrm));
		}
		return clips.get(path)!;
	}

	let current: import('three').AnimationAction | undefined;
	let idleIndex = 0;
	let busyUntil = 0;
	async function play(path: string, loop: boolean) {
		const action = mixer.clipAction(await clip(path));
		action.reset();
		action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
		action.clampWhenFinished = !loop;
		action.fadeIn(0.3).play();
		current?.fadeOut(0.3);
		current = action;
		return action.getClip().duration;
	}
	async function nextIdle() {
		if (!manifest.idle.length) return;
		const duration = await play(manifest.idle[idleIndex++ % manifest.idle.length], false);
		busyUntil = performance.now() + duration * 1000;
	}

	let mouth = 0;
	const clock = new THREE.Clock();
	let frame = 0;
	function resize() {
		const { clientWidth, clientHeight } = canvas;
		renderer.setSize(clientWidth, clientHeight, false);
		camera.aspect = clientWidth / Math.max(clientHeight, 1);
		camera.updateProjectionMatrix();
	}
	function tick() {
		const delta = clock.getDelta();
		mixer.update(delta);
		vrm.expressionManager?.setValue('aa', mouth);
		vrm.update(delta);
		if (performance.now() > busyUntil) {
			busyUntil = Number.POSITIVE_INFINITY;
			void nextIdle().catch(() => undefined);
		}
		renderer.render(scene, camera);
		frame = requestAnimationFrame(tick);
	}
	resize();
	window.addEventListener('resize', resize);
	await nextIdle().catch(() => undefined);
	tick();

	return {
		playMotion(category) {
			const list = manifest.motions[category] ?? manifest.motions.neutral;
			if (!list?.length) return;
			const path = list[Math.floor(Math.random() * list.length)];
			busyUntil = Number.POSITIVE_INFINITY;
			void play(path, false)
				.then((duration) => (busyUntil = performance.now() + duration * 1000))
				.catch(() => (busyUntil = 0));
		},
		setMouth(level) {
			mouth = Math.max(0, Math.min(1, level));
		},
		dispose() {
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', resize);
			VRMUtils.deepDispose(vrm.scene);
			renderer.dispose();
		}
	};
}
