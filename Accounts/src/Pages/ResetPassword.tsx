import { RESET_PASSWORD_API_URL } from "../Utils/ApiPaths";
import Route from "Common/Types/API/Route";
import URL from "Common/Types/API/URL";
import ModelForm, { FormType } from "Common/UI/Components/Forms/ModelForm";
import FormFieldSchemaType from "Common/UI/Components/Forms/Types/FormFieldSchemaType";
import Link from "Common/UI/Components/Link/Link";
import OneUptimeLogo from "Common/UI/Images/logos/SVG/3-transparent.svg";
import Navigation from "Common/UI/Utils/Navigation";
import User from "Common/Models/DatabaseModels/User";
import React, { useState } from "react";

const RegisterPage: () => JSX.Element = () => {
  const apiUrl: URL = RESET_PASSWORD_API_URL;
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          className="mx-auto h-12 w-auto"
          src={UptimeLogo}
          alt="Your Company"
        />
        <h2 className="mt-6 text-center text-2xl  tracking-tight text-gray-900">
          Reset your password
        </h2>

        {!isSuccess && (
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password and we will have it updated.{" "}
          </p>
        )}

        {isSuccess && (
          <p className="mt-2 text-center text-sm text-gray-600">
            Your password has been updated. Please log in.
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {!isSuccess && (
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <ModelForm<User>
              modelType={User}
              id="register-form"
              name="Reset Password"
              onBeforeCreate={(item: User): Promise<User> => {
                item.resetPasswordToken =
                  Navigation.getLastParam()
                    ?.toString()
                    .replace("/", "")
                    .toString() || "";
                return Promise.resolve(item);
              }}
              showAsColumns={1}
              maxPrimaryButtonWidth={true}
              fields={[
                {
                  field: {
                    password: true,
                  },
                  fieldType: FormFieldSchemaType.Password,
                  validation: {
                    minLength: 6,
                  },
                  placeholder: "New Password",
                  title: "New Password",
                  required: true,
                  showEvenIfPermissionDoesNotExist: true,
                },
                {
                  field: {
                    confirmPassword: true,
                  } as any,
                  validation: {
                    minLength: 6,
                    toMatchField: "password",
                  },
                  fieldType: FormFieldSchemaType.Password,
                  placeholder: "Confirm Password",
                  title: "Confirm Password",
                  overrideFieldKey: "confirmPassword",
                  required: true,
                  showEvenIfPermissionDoesNotExist: true,
                },
              ]}
              createOrUpdateApiUrl={apiUrl}
              formType={FormType.Create}
              submitButtonText={"Reset Password"}
              onSuccess={() => {
                setIsSuccess(true);
              }}
            />
          </div>
        )}

        <div className="mt-5 text-center">
          <p className="text-muted mb-0 text-gray-500">
            Know your password?{" "}
            <Link
              to={new Route("/accounts/login")}
              className="text-indigo-500 hover:text-indigo-900 cursor-pointer"
            >
              Log in.
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
