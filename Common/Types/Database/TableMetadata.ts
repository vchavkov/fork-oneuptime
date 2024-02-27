import IconProp from '../Icon/IconProp';
import GenericFunction from '../GenericFunction';

export default (props: {
    tableName: string;
    singularName: string;
    pluralName: string;
    icon: IconProp;
    tableDescription: string;
}) => {
    return (ctr: GenericFunction) => {
        ctr.prototype.singularName = props.singularName;
        ctr.prototype.tableName = props.tableName;
        ctr.prototype.icon = props.icon;
        ctr.prototype.tableDescription = props.tableDescription;
        ctr.prototype.pluralName = props.pluralName;
    };
};
