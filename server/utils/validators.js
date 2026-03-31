// Server-side validation schemas using Joi
// Import the relevant schema in your controller and validate req.body

const Joi = require('joi');

const phoneSchema = Joi.object({
  phone: Joi.string().pattern(/^\d{10}$/).required().messages({
    'string.pattern.base': 'Phone number must be 10 digits',
    'any.required': 'Phone number is required',
  }),
});

const verifyOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^\d{10}$/).required(),
  otp: Joi.string().length(6).required(),
  firebaseToken: Joi.string().allow('', null),
});

const completeProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required',
  }),
  hostel: Joi.string().allow('', null),
  preferredGate: Joi.string().valid('Main Gate', 'Back Gate', 'Side Gate (Library)'),
});

const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
  hostel: Joi.string().required(),
  gate: Joi.string().required(),
  note: Joi.string().allow('', null),
  paymentMethod: Joi.string().valid('upi', 'cod').required(),
});

const productSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  price: Joi.number().min(0).required(),
  mrp: Joi.number().min(0).allow(null),
  category: Joi.string().required(),
  subCategory: Joi.string().allow('', null),
  image: Joi.string().allow('', null),
  inStock: Joi.boolean(),
  stockQty: Joi.number().integer().min(0),
  requiresPrescription: Joi.boolean(),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
  isActive: Joi.boolean(),
});

const categorySchema = Joi.object({
  name: Joi.string().required(),
  icon: Joi.string().allow('', null),
  image: Joi.string().allow('', null),
  displayOrder: Joi.number().integer(),
  isActive: Joi.boolean(),
});

module.exports = {
  phoneSchema,
  verifyOtpSchema,
  completeProfileSchema,
  createOrderSchema,
  productSchema,
  categorySchema,
};
