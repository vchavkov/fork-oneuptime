import PageComponentProps from "../../PageComponentProps";
import ObjectID from "Common/Types/ObjectID";
import CustomFieldsDetail from "Common/UI/Components/CustomFields/CustomFieldsDetail";
import Navigation from "Common/UI/Utils/Navigation";
import ProjectUtil from "Common/UI/Utils/Project";
import Incident from "Common/Models/DatabaseModels/Incident";
import IncidentCustomField from "Common/Models/DatabaseModels/IncidentCustomField";
import React, { FunctionComponent, ReactElement } from "react";

const IncidentCustomFields: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  const modelId: ObjectID = Navigation.getLastParamAsObjectID(1);

  return (
    <CustomFieldsDetail
      title="Incident Custom Fields"
      description="Custom fields help you add new fields to your resources in CBS Uptime."
      modelType={Incident}
      customFieldType={IncidentCustomField}
      name="Incident Custom Fields"
      projectId={ProjectUtil.getCurrentProject()!.id!}
      modelId={modelId}
    />
  );
};

export default IncidentCustomFields;
