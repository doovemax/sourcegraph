import { experimentManager } from "sourcegraph/util/ExperimentManager";
const enabled = "enabled";

class Feature {
	private beta: boolean = true;

	constructor(private name: string) { }

	public isEnabled(): boolean {
		if (!global.window) {
			return false;
		}
		// if not explicitly enabled/disabled, return true if we have beta enabled
		if (this.beta && localStorage.getItem(this.name) === null && Features.beta.isEnabled()) {
			return true;
		}
		return localStorage[this.name] === enabled;
	}

	public enable(): void {
		localStorage[this.name] = enabled;
	}

	public disable(): void {
		localStorage[this.name] = "disabled";
	}

	public toggle(): void {
		if (this.isEnabled()) {
			this.disable();
		} else {
			this.enable();
		}
	}

	public disableBeta(): this {
		this.beta = false;
		return this;
	}
}

export const Features = {
	langCSS: new Feature("lang-css"),
	langPHP: new Feature("lang-php"),
	langPython: new Feature("lang-python"),
	langJava: new Feature("lang-java"),
	googleCloudPlatform: new Feature("google-cloud-platform"),
	projectWow: new Feature("project_wow"),

	// commitInfoBar shows the horizontal bar above the editor with
	// the file's commit log.
	commitInfoBar: new Feature("commitInfoBar").disableBeta(),

	// trace is whether to show trace URLs to LightStep in console log messages.
	trace: new Feature("trace"),

	beta: new Feature("beta").disableBeta(),
	eventLogDebug: new Feature("event-log-debug").disableBeta(),
	actionLogDebug: new Feature("action-log-debug").disableBeta(),
	experimentLogDebug: new Feature("experiment-log-debug").disableBeta(),

	experimentManager,
};

if (global.window) {
	(window as any).features = Features;
}
