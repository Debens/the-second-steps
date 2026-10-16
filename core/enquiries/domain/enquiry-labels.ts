import type {
  AppraisalStatusCode,
  EnquiryStageCode,
  LettingServiceCode,
} from "./enquiry";

export const ENQUIRY_STAGE_LABELS: Readonly<Record<EnquiryStageCode, string>> =
  {
    new_enquiry: "New lead",
    appraisal_booked: "Appraisal booked",
    appraisal_completed: "Appraisal completed",
    won: "Instruction won",
    lost: "Lost",
    postponed: "Postponed",
  };

export const APPRAISAL_STATUS_LABELS: Readonly<
  Record<AppraisalStatusCode, string>
> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  did_not_attend: "Did not attend",
};

export const LETTING_SERVICE_LABELS: Readonly<
  Record<LettingServiceCode, string>
> = {
  let_only: "Let only",
  rent_collection: "Rent collection",
  fully_managed: "Fully managed",
};
