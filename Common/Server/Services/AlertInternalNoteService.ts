import DatabaseService from "./DatabaseService";
import Model from "Common/Models/DatabaseModels/AlertInternalNote";

export class Service extends DatabaseService<Model> {
  public constructor() {
    super(Model);
  }
}

export default new Service();
