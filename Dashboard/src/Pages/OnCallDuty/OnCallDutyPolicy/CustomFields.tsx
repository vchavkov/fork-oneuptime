import PageComponentProps from "../../PageComponentProps";
import ObjectID from "Common/Types/ObjectID";
import CustomFieldsDetail from "Common/UI/Components/CustomFields/CustomFieldsDetail";
import Navigation from "Common/UI/Utils/Navigation";
import ProjectUtil from "Common/UI/Utils/Project";
import OnCallDutyPolicy from "Common/Models/DatabaseModels/OnCallDutyPolicy";
import OnCallDutyPolicyCustomField from "Common/Models/DatabaseModels/OnCallDutyPolicyCustomField";
import React, { Fragment, FunctionComponent, ReactElement } from "react";

const OnCallDutyPolicyCustomFields: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  const modelId: ObjectID = Navigation.getLastParamAsObjectID(1);

  return (
    <Fragment>
      <CustomFieldsDetail
        title="Custom Fields"
        description="Custom fields help you add new fields to your resources in CBS Uptime."
        modelType={OnCallDutyPolicy}
        customFieldType={OnCallDutyPolicyCustomField}
        name="Custom Fields"
        projectId={ProjectUtil.getCurrentProject()!.id!}
        modelId={modelId}
      />
    </Fragment>
  );
};

export default OnCallDutyPolicyCustomFields;
