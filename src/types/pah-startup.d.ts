export {};

declare global {
	interface Window {
		readonly __PAH_ADMIN_STARTUP__?: {
			attemptId: string;
			stage: string;
			completed: boolean;
			timedOut: boolean;
			timer: number;
		};
	}
}
