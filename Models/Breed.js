const mongoose = require('mongoose');

const breedSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    petType: {
        type: String,
        required: true,
        enum: ['Dog', 'Cat']
    },
    description: {
        type: String,
        default: ''
    },
    temperament: {
        type: String,
        default: ''
    },
    lifeSpan: {
        type: String,
        default: ''
    },
    weight: {
        imperial: {
            type: String,
            default: ''
        },
        metric: {
            type: String,
            default: ''
        }
    },
    height: {
        imperial: {
            type: String,
            default: ''
        },
        metric: {
            type: String,
            default: ''
        }
    },
    origin: {
        type: String,
        default: ''
    },
    referenceImageId: {
        type: String,
        default: ''
    },
    apiId: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
});

const Breed = mongoose.model('Breed', breedSchema);

module.exports = Breed; 