# Architecture Rules

- Public donor directory reads must use the phone-free `donors_public` view; only authenticated reads may query `donors`, and guest registration must use the validated `register_public_donor` function so donor phone numbers never enter public API responses.