/**
 * botたんの3Dモデル（BOT-05）。three.js と three-vrm は botたんが参加したときだけ読み込む。
 * 待機の動きを繰り返し、返事の動きのカテゴリを受けたらその動きを1回流す。口は声の大きさで動かす。
 * 話していない間も、まばたき・表情の変化・ときどきのしぐさを流す（idlePlanner）。
 */
import { createIdlePlanner } from './idlePlanner';

/** 目線の揺らぎの幅（カメラのまわり、メートル）と、大きくそらす割合。convo の web/static/avatar.js と同じ */
const GAZE_SMALL: [number, number] = [0.12, 0.06];
const GAZE_AWAY: [number, number] = [0.45, 0.2];
const GAZE_AWAY_CHANCE = 0.2;
/** しぐさに使う作り置きの動きのカテゴリ */
const GESTURE_CATEGORIES = ['neutral', 'greeting', 'happy'];
/** 声がこの大きさを下回って、この時間たったら「話していない」 */
const SPEAKING_LEVEL = 0.05;
const SPEAKING_HOLD_MS = 600;
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
	const { VRMAnimationLoaderPlugin, VRMLookAtQuaternionProxy, createVRMAnimationClip } =
		await import('@pixiv/three-vrm-animation');

	const url = (path: string) => `${base.replace(/\/$/, '')}/${path}`;
	const manifest = (await (await fetch(url('manifest.json'))).json()) as BotManifest;

	const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
	const scene = new THREE.Scene();
	// 縦長の枠に上半身（胸から上）が収まる位置（design.md D4）
	const camera = new THREE.PerspectiveCamera(30, 0.8, 0.1, 20);
	camera.position.set(0, 1.3, 1.75);
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
	// 動き（VRMA）が目線を上書きしないようにし、目線はカメラのそばの点を見る（BOT-05、design.md D9）
	const lookProxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
	lookProxy.name = 'lookAtQuaternionProxy';
	vrm.scene.add(lookProxy);
	const gaze = new THREE.Object3D();
	scene.add(gaze);
	if (vrm.lookAt) vrm.lookAt.target = gaze;
	const gazeAim = new THREE.Vector3();
	const gazeNow = new THREE.Vector3();
	let gazeAt = 0;
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
		// 同じ動きを続けて流すと action が同じものになる。消すと重みが0になり T ポーズになる
		if (current && current !== action) current.fadeOut(0.3);
		current = action;
		return action.getClip().duration;
	}
	async function nextIdle() {
		if (!manifest.idle.length) return;
		const duration = await play(manifest.idle[idleIndex++ % manifest.idle.length], false);
		busyUntil = performance.now() + duration * 1000;
	}

	let mouth = 0;
	let lastVoiceAt = Number.NEGATIVE_INFINITY;
	/** 返事の動きかしぐさを流し終える時刻（待機の動きは含めない） */
	let motionUntil = 0;
	const planner = createIdlePlanner({
		reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
	});
	function playGesture() {
		const pool = GESTURE_CATEGORIES.flatMap((category) => manifest.motions[category] ?? []);
		if (!pool.length) return;
		const path = pool[Math.floor(Math.random() * pool.length)];
		busyUntil = Number.POSITIVE_INFINITY;
		motionUntil = Number.POSITIVE_INFINITY;
		void play(path, false)
			.then((duration) => (busyUntil = motionUntil = performance.now() + duration * 1000))
			.catch(() => (busyUntil = motionUntil = 0));
	}
	// 目線：1.5〜4秒ごとにカメラのまわりの少し違う点を見て、ときどき大きくそらしてすぐ戻す（convo の画面と同じ）
	function updateGaze(dt: number, now: number) {
		if (now > gazeAt) {
			const away = Math.random() < GAZE_AWAY_CHANCE;
			const [x, y] = away ? GAZE_AWAY : GAZE_SMALL;
			gazeAim.set((Math.random() * 2 - 1) * x, (Math.random() * 2 - 1) * y, 0);
			gazeAt = now + (away ? 0.8 + Math.random() * 0.6 : 1.5 + Math.random() * 2.5);
		}
		gazeNow.lerp(gazeAim, 1 - Math.exp(-10 * dt)); // 目はすばやく動く
		gaze.position.copy(camera.position).add(gazeNow);
	}
	const clock = new THREE.Clock();
	let frame = 0;
	// 大きな画面でも描画の大きさは 1280×1600 までに抑える（design.md D4）
	const MAX_W = 1280;
	const MAX_H = 1600;
	function resize() {
		const { clientWidth, clientHeight } = canvas;
		const ratio = Math.min(
			window.devicePixelRatio,
			2,
			MAX_W / Math.max(clientWidth, 1),
			MAX_H / Math.max(clientHeight, 1)
		);
		renderer.setPixelRatio(ratio);
		renderer.setSize(clientWidth, clientHeight, false);
		camera.aspect = clientWidth / Math.max(clientHeight, 1);
		camera.updateProjectionMatrix();
	}
	function tick() {
		const delta = clock.getDelta();
		mixer.update(delta);
		const nowMs = performance.now();
		const idle = planner({
			now: clock.elapsedTime,
			speaking: nowMs - lastVoiceAt < SPEAKING_HOLD_MS,
			moving: nowMs < motionUntil
		});
		const expressions = vrm.expressionManager;
		expressions?.setValue('aa', mouth);
		expressions?.setValue('blink', idle.blink);
		expressions?.setValue('happy', idle.happy);
		expressions?.setValue('relaxed', idle.relaxed);
		if (idle.gesture) playGesture();
		updateGaze(delta, clock.elapsedTime);
		vrm.update(delta);
		if (performance.now() > busyUntil) {
			busyUntil = Number.POSITIVE_INFINITY;
			void nextIdle().catch(() => undefined);
		}
		if (onScreen) renderer.render(scene, camera);
		frame = requestAnimationFrame(tick);
	}
	// 画面の外へスクロールしている間は描かない（見えないタブでは requestAnimationFrame 自体が止まる）
	let onScreen = true;
	const visibility = new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting));
	visibility.observe(canvas);
	const sizing = new ResizeObserver(resize);
	sizing.observe(canvas);
	resize();
	await nextIdle().catch(() => undefined);
	tick();

	return {
		playMotion(category) {
			const list = manifest.motions[category] ?? manifest.motions.neutral;
			if (!list?.length) return;
			const path = list[Math.floor(Math.random() * list.length)];
			// しぐさの途中でも返事の動きに切り替える（BOT-05）
			busyUntil = Number.POSITIVE_INFINITY;
			motionUntil = Number.POSITIVE_INFINITY;
			void play(path, false)
				.then((duration) => (busyUntil = motionUntil = performance.now() + duration * 1000))
				.catch(() => (busyUntil = motionUntil = 0));
		},
		setMouth(level) {
			mouth = Math.max(0, Math.min(1, level));
			if (mouth > SPEAKING_LEVEL) lastVoiceAt = performance.now();
		},
		dispose() {
			cancelAnimationFrame(frame);
			visibility.disconnect();
			sizing.disconnect();
			VRMUtils.deepDispose(vrm.scene);
			renderer.dispose();
		}
	};
}
