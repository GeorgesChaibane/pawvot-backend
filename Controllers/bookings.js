const express = require('express');
const router = express.Router();
const Booking = require('../Models/Booking');
const Pet = require('../Models/Pet');
const { protect } = require('../middleware/auth');

/**
 * @route POST /api/bookings
 * @desc Create a new pet booking
 * @access Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { 
      petId, 
      bookingDate, 
      name, 
      email, 
      phone, 
      message 
    } = req.body;

    // Validation
    if (!petId || !bookingDate) {
      return res.status(400).json({ message: 'Pet ID and booking date are required' });
    }

    // Check if pet exists
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Parse date string to Date object
    const parsedBookingDate = new Date(bookingDate);
    
    // Check for time conflicts
    const conflict = await Booking.checkConflict(petId, parsedBookingDate);
    if (conflict) {
      return res.status(409).json({ 
        message: 'This time slot is already booked. Please select another time.' 
      });
    }
    
    // Create new booking
    const booking = new Booking({
      user: req.user._id,
      pet: petId,
      bookingDate: parsedBookingDate,
      name,
      email,
      phone,
      message: message || '',
      status: 'pending'
    });

    const createdBooking = await booking.save();
    
    // Populate pet details for the response
    await createdBooking.populate('pet', 'name breed type image');
    
    res.status(201).json(createdBooking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @route GET /api/bookings
 * @desc Get all bookings for current user
 * @access Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('pet', 'name breed type image')
      .sort({ bookingDate: -1 });
    
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/bookings/:id
 * @desc Get booking by ID
 * @access Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('pet', 'name breed type image');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if booking belongs to user
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this booking' });
    }
    
    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/bookings/:id
 * @desc Update booking details
 * @access Private
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const { bookingDate, name, email, phone, message } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if booking belongs to user
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }
    
    // Check if booking is already cancelled or completed
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({ 
        message: `Cannot update a ${booking.status} booking` 
      });
    }
    
    // If date is changing, check for conflicts
    if (bookingDate && new Date(bookingDate).getTime() !== new Date(booking.bookingDate).getTime()) {
      const parsedBookingDate = new Date(bookingDate);
      const conflict = await Booking.checkConflict(booking.pet, parsedBookingDate);
      
      if (conflict && conflict._id.toString() !== booking._id.toString()) {
        return res.status(409).json({ 
          message: 'This time slot is already booked. Please select another time.' 
        });
      }
      
      booking.bookingDate = parsedBookingDate;
    }
    
    // Update fields if provided
    if (name) booking.name = name;
    if (email) booking.email = email;
    if (phone) booking.phone = phone;
    if (message !== undefined) booking.message = message;
    
    const updatedBooking = await booking.save();
    
    // Populate pet details for the response
    await updatedBooking.populate('pet', 'name breed type image');
    
    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/bookings/:id/cancel
 * @desc Cancel a booking
 * @access Private
 */
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if booking belongs to user
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    
    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }
    
    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed booking' });
    }
    
    booking.status = 'cancelled';
    
    const cancelledBooking = await booking.save();
    
    // Populate pet details for the response
    await cancelledBooking.populate('pet', 'name breed type image');
    
    res.status(200).json(cancelledBooking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route GET /api/bookings/available/:petId
 * @desc Get available booking times for a pet
 * @access Public
 */
router.get('/available/:petId', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    
    // Check if pet exists
    const pet = await Pet.findById(req.params.petId);
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    
    // Parse date (assuming format YYYY-MM-DD)
    const selectedDate = new Date(date);
    
    // Get all bookings for this pet and date
    const bookings = await Booking.find({
      pet: req.params.petId,
      bookingDate: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lte: new Date(selectedDate.setHours(23, 59, 59, 999))
      },
      status: { $ne: 'cancelled' }
    });
    
    // Generate available time slots
    const availableTimeSlots = [];
    const bookedTimes = bookings.map(booking => new Date(booking.bookingDate).getHours() * 60 + new Date(booking.bookingDate).getMinutes());
    
    // Facility hours 10AM to 5PM, 30 minute slots
    for (let hour = 10; hour < 17; hour++) {
      for (let minutes of [0, 30]) {
        const slotTime = hour * 60 + minutes;
        
        // Check if this time is already booked or within 30 mins of another booking
        const isBooked = bookedTimes.some(bookedTime => 
          Math.abs(bookedTime - slotTime) < 30
        );
        
        if (!isBooked) {
          // Format as HH:MM AM/PM
          const formattedHour = hour % 12 || 12;
          const period = hour < 12 ? 'AM' : 'PM';
          const timeSlot = `${formattedHour}:${minutes === 0 ? '00' : minutes} ${period}`;
          
          availableTimeSlots.push(timeSlot);
        }
      }
    }
    
    res.status(200).json({ availableTimeSlots });
  } catch (error) {
    console.error('Error getting available times:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 