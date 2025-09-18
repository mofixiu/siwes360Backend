const { validationResult } = require('express-validator')

const checkValidation = (req, res, next) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        if (req.path.startsWith('/admin/api')) {
            return res.status(422).json({
                errors: result.array()
            });
        } else {
            req.flash("You have some errors in your form", "error");
            const resErrors = result.mapped()
            req.session.errors = resErrors;
            req.session.old = req.body;           
            return res.back();
        }
    }
    next();
}

module.exports = checkValidation