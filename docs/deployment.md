# Deployment Notes

## Environments
- Development: `.env.development.example`
- Production: `.env.production.example`

## Recommended Steps
1. Set `NODE_ENV=production`.
2. Configure `MONGO_URI` for your production database.
3. Set `JWT_SECRET` and rotate regularly.
4. Set `CORS_ORIGIN` to your frontend domain.
5. Run database migrations/seed if required.
