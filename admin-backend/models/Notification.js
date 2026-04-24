const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        default: 'Admin Message'
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['general', 'payment', 'offer', 'alert'],
        default: 'general'
    },
    target: {
        type: String,
        enum: ['all', 'individual'],
        default: 'all'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Null if target is 'all'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
