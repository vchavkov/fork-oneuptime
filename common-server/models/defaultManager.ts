import mongoose, { RequiredFields, UniqueFields } from '../utils/ORM';

const Schema = mongoose.Schema;
const schema = new Schema(
    {
        store: {
            type: Object,
            default: {
                module: 'oneuptime-le-store',
            },
        },
        challenges: {
            'http-01': {
                type: Object,
                default: {
                    module: 'oneuptime-acme-http-01',
                },
            },
        },
        renewOffset: { type: String, default: '-45d' },
        renewStagger: { type: String, default: '3d' },
        accountKeyType: String,
        serverKeyType: String,
        subscriberEmail: String,
        agreeToTerms: { type: Boolean, default: true },
        deleted: { type: Boolean, default: false },
        deletedAt: Date,
    },
    { timestamps: true }
);

export const requiredFields: RequiredFields = schema.requiredPaths();

export const uniqueFields: UniqueFields = [];

export const sligifyField: string = '';

export default mongoose.model('DefaultManager', schema);
