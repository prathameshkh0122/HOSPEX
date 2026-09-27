const Chat = require('../models/Chat');
const ChatMessage = require('../models/ChatMessage');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

function isParticipant(chat, userId) {
  return chat.participants.some((participant) => participant.equals(userId));
}

exports.mine = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ participants: req.user._id })
    .populate('resource', 'name image')
    .populate('participants', 'businessName')
    .sort({ lastMessageAt: -1 }).lean();
  res.json({ success: true, data: { chats } });
});

exports.messages = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) throw httpError(404, 'Chat not found.');
  if (!isParticipant(chat, req.user._id)) throw httpError(403, 'You are not part of this chat.');
  const messages = await ChatMessage.find({ chat: chat._id }).populate('sender', 'businessName').sort({ createdAt: 1 }).lean();
  res.json({ success: true, data: { chat, messages } });
});

exports.send = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) throw httpError(404, 'Chat not found.');
  if (!isParticipant(chat, req.user._id)) throw httpError(403, 'You are not part of this chat.');
  const text = String(req.body.text || '').trim();
  if (!text && !req.file) throw httpError(400, 'Write a message or attach an image.');
  const message = await ChatMessage.create({ chat: chat._id, sender: req.user._id, text, image: req.file ? `/uploads/chat/${req.file.filename}` : '' });
  chat.lastMessageAt = new Date();
  await chat.save();
  await message.populate('sender', 'businessName');
  res.status(201).json({ success: true, data: { message } });
});
