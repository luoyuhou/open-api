# prisma
1. tsconfig.json
    1. ```{"compilerOptions": {"sourceMap": true,"outDir": "dist","strict": true,"lib": ["esnext"],"esModuleInterop": true}}```
2. `npx prisma`
3. init
    1. `npx prisma init`
4. migrate
    1. `npx prisma migrate dev --name init`
5. schema
    1. `npx prisma db pull`
6. generate
    1. `npx prisma generate`
7. other