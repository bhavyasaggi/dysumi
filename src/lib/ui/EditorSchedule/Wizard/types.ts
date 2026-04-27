import type { Dispatch, SetStateAction } from "react";

import type { CalendarEvent } from "@/lib/utils/ics";

/** Shared props passed from the Wizard orchestrator to each step sub-component. */
export interface WizardStepProps {
	formData: Partial<CalendarEvent>;
	setFormData: Dispatch<SetStateAction<Partial<CalendarEvent>>>;
	/** The original event being edited (null when creating). */
	event: CalendarEvent | null;
}
