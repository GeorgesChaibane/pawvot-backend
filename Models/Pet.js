const mongoose = require('mongoose');

const petSchema = mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['Dog', 'Cat']
    },
    name: {
        type: String,
        required: true
    },
    breed: {
        type: String,
        required: true
    },
    age: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    imageId: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    adoptionStatus: {
        type: String,
        enum: ['Available', 'Pending', 'Adopted'],
        default: 'Available'
    },
    createdAt: {
        type: Date,
        default: new Date()
    }
});

const Pet = mongoose.model('Pet', petSchema);

module.exports = Pet; 