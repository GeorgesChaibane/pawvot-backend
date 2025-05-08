const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
        required: true
    },
    bookingDate: {
        type: Date,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    message: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Add an index for checking time conflicts
bookingSchema.index({ pet: 1, bookingDate: 1 });

// Static method to check for booking conflicts
bookingSchema.statics.checkConflict = async function(petId, bookingDate) {
    // Convert to Date object if string
    const date = new Date(bookingDate);
    
    // Get start and end of the hour (±30 minutes from the target time)
    const startTime = new Date(date);
    startTime.setMinutes(date.getMinutes() - 30);
    
    const endTime = new Date(date);
    endTime.setMinutes(date.getMinutes() + 30);
    
    // Find any bookings for the same pet in the time range
    const conflictingBooking = await this.findOne({
        pet: petId,
        bookingDate: { 
            $gte: startTime,
            $lte: endTime
        },
        status: { $nin: ['cancelled'] } // Exclude cancelled bookings
    });
    
    return conflictingBooking;
};

module.exports = mongoose.model('Booking', bookingSchema); 