import LabelsElement from "../../Components/Label/Labels";
import DashboardNavigation from "../../Utils/Navigation";
import PageMap from "../../Utils/PageMap";
import RouteMap, { RouteUtil } from "../../Utils/RouteMap";
import PageComponentProps from "../PageComponentProps";
import Route from "Common/Types/API/Route";
import FormFieldSchemaType from "Common/UI/Components/Forms/Types/FormFieldSchemaType";
import ModelTable from "Common/UI/Components/ModelTable/ModelTable";
import Page from "Common/UI/Components/Page/Page";
import FieldType from "Common/UI/Components/Types/FieldType";
import Navigation from "Common/UI/Utils/Navigation";
import Label from "Common/Models/DatabaseModels/Label";
import Dashboard from "Common/Models/DatabaseModels/Dashboard";
import React, { FunctionComponent, ReactElement } from "react";
import DashboardElement from "../../Components/Dashboard/DashboardElement";

const Dashboards: FunctionComponent<PageComponentProps> = (): ReactElement => {
  return (
    <Page
      title={"Dashboards"}
      breadcrumbLinks={[
        {
          title: "Project",
          to: RouteUtil.populateRouteParams(RouteMap[PageMap.HOME] as Route),
        },
        {
          title: "Dashboards",
          to: RouteUtil.populateRouteParams(
            RouteMap[PageMap.STATUS_PAGES] as Route,
          ),
        },
      ]}
    >
      <ModelTable<Dashboard>
        modelType={Dashboard}
        id="dashboard-table"
        isDeleteable={false}
        isEditable={false}
        isCreateable={true}
        name="Dashboards"
        isViewable={true}
        cardProps={{
          title: "Dashboards",
          description: "Here is a list of dashboards for this project.",
        }}
        showViewIdButton={true}
        noItemsMessage={"No dashboards found."}
        formFields={[
          {
            field: {
              name: true,
            },
            title: "Name",
            fieldType: FormFieldSchemaType.Text,
            required: true,
            placeholder: "Dashboard Name",
            validation: {
              minLength: 2,
            },
          },
          {
            field: {
              description: true,
            },
            title: "Description",
            fieldType: FormFieldSchemaType.LongText,
            required: true,
            placeholder: "Description",
          },
        ]}
        saveFilterProps={{
          tableId: "all-dashboards-table",
        }}
        showRefreshButton={true}
        viewPageRoute={Navigation.getCurrentRoute()}
        filters={[
          {
            field: {
              name: true,
            },
            title: "Name",
            type: FieldType.Text,
          },
          {
            field: {
              description: true,
            },
            title: "Description",
            type: FieldType.Text,
          },
          {
            field: {
              labels: {
                name: true,
                color: true,
              },
            },
            title: "Labels",
            type: FieldType.EntityArray,
            filterEntityType: Label,
            filterQuery: {
              projectId: DashboardNavigation.getProjectId()!,
            },
            filterDropdownField: {
              label: "name",
              value: "_id",
            },
          },
        ]}
        columns={[
          {
            field: {
              name: true,
            },
            title: "Name",
            type: FieldType.Element,
            getElement: (item: Dashboard): ReactElement => {
              return <DashboardElement dashboard={item} />;
            },
          },
          {
            field: {
              description: true,
            },
            title: "Description",
            type: FieldType.Text,
          },
          {
            field: {
              labels: {
                name: true,
                color: true,
              },
            },
            title: "Labels",
            type: FieldType.EntityArray,

            getElement: (item: Dashboard): ReactElement => {
              return <LabelsElement labels={item["labels"] || []} />;
            },
          },
        ]}
      />
    </Page>
  );
};

export default Dashboards;