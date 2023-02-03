import type { ReactElement, RefObject } from 'react';
import React, { useRef, useState } from 'react';
import type { ButtonStyleType } from '../Button/Button';
import Modal from '../Modal/Modal';
import type { ComponentProps as ModelFormComponentProps } from '../Forms/ModelForm';
import ModelForm from '../Forms/ModelForm';
import type BaseModel from 'Common/Models/BaseModel';
import ButtonType from '../Button/ButtonTypes';
import type { JSONObjectOrArray } from 'Common/Types/JSON';
import type { FormikProps, FormikValues } from 'formik';
import type ObjectID from 'Common/Types/ObjectID';
import Alert, { AlertType } from '../Alerts/Alert';
import type FormValues from '../Forms/Types/FormValues';

export interface ComponentProps<TBaseModel extends BaseModel> {
    title: string;
    description: string;
    name: string;
    modelType: { new (): TBaseModel };
    initialValues?: FormValues<TBaseModel> | undefined;
    onClose?: undefined | (() => void);
    submitButtonText?: undefined | string;
    onSuccess?:
        | undefined
        | ((data: TBaseModel | JSONObjectOrArray | Array<TBaseModel>) => void);
    submitButtonStyleType?: undefined | ButtonStyleType;
    formProps: ModelFormComponentProps<TBaseModel>;
    modelIdToEdit?: ObjectID | undefined;
    onBeforeCreate?: ((item: TBaseModel) => Promise<TBaseModel>) | undefined;
    footer?: ReactElement | undefined;
}

const ModelFormModal: Function = <TBaseModel extends BaseModel>(
    props: ComponentProps<TBaseModel>
): ReactElement => {
    const [isFormLoading, setIsFormLoading] = useState<boolean>(false);
    const formRef: RefObject<FormikProps<FormikValues>> =
        useRef<FormikProps<FormikValues>>(null);
    const [error, setError] = useState<string>('');

    return (
        <Modal
            {...props}
            submitButtonType={ButtonType.Submit}
            isLoading={isFormLoading}
            description={props.description}
            disableSubmitButton={isFormLoading}
            onSubmit={() => {
                formRef.current && formRef.current.handleSubmit();
            }}
            error={error}
        >
            {!error ? (
                <>
                    <ModelForm<TBaseModel>
                        {...props.formProps}
                        name={props.name}
                        modelType={props.modelType}
                        modelIdToEdit={props.modelIdToEdit}
                        hideSubmitButton={true}
                        onLoadingChange={(isFormLoading: boolean) => {
                            setIsFormLoading(isFormLoading);
                        }}
                        formRef={formRef}
                        initialValues={props.initialValues}
                        onSuccess={(
                            data:
                                | TBaseModel
                                | JSONObjectOrArray
                                | Array<TBaseModel>
                        ) => {
                            props.onSuccess && props.onSuccess(data);
                        }}
                        onError={(error: string) => {
                            setError(error);
                        }}
                        onBeforeCreate={props.onBeforeCreate}
                    />

                    {props.footer}
                </>
            ) : (
                <></>
            )}

            {error ? <Alert title={error} type={AlertType.DANGER} /> : <></>}
        </Modal>
    );
};

export default ModelFormModal;
