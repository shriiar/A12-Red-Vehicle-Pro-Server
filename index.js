const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.name}:${process.env.password}@cluster0.j5bqj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const usersCollection = client.db('Assignment12').collection('users');
        const productsCollection = client.db('Assignment12').collection('products');
        const ordersCollection = client.db('Assignment12').collection('orders');
        const paymentCollection = client.db('Assignment12').collection('payment');
        const reviewsCollection = client.db('Assignment12').collection('reviews');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }

        app.get('/users', verifyJWT, async (req, res) => {
            const email = req.query.email;
            console.log(email);
            if (email === undefined || email === '') {
                const query = {};
                const cursor = usersCollection.find(query);
                const user = await cursor.toArray();
                res.send(user);
            }
            else {
                const query = { email: email };
                const cursor = usersCollection.find(query);
                const user = await cursor.toArray();
                res.send(user);
            }
        })

        // As every product will show in home page with out user auth, that is why jwt is not implemented
        app.get('/products', async (req, res) => {
            const productCode = req.query.productCode;
            const id = req.query.id;
            console.log("gg", id, productCode);
            if (productCode !== undefined && id === undefined) {
                const query = { productCode: productCode };
                const cursor = productsCollection.find(query);
                const products = await cursor.toArray();
                res.send(products);
            }
            else if (productCode === undefined && id !== undefined) {
                console.log("ok");
                const _id = req.query.id;
                const cursor = productsCollection.find({ "_id": ObjectId(_id) });
                const products = await cursor.toArray();
                res.send(products);
            }
            else {
                const query = {};
                const cursor = productsCollection.find(query);
                const products = await cursor.toArray();
                res.send(products);
            }
        })

        // As every review will show in home page with out user auth, that is why jwt is not implemented
        app.get('/reviews', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            if (email !== undefined) {
                const query = { email: email };
                const cursor = reviewsCollection.find(query);
                const reviews = await cursor.toArray();
                res.send(reviews);
            }
            else {
                const query = {};
                const cursor = reviewsCollection.find(query);
                const reviews = await cursor.toArray();
                res.send(reviews);
            }
        })

        app.get('/orderedProducts/:id', verifyJWT, async (req, res) => {
            const _id = req.params.id;
            console.log(_id);
            const cursor = ordersCollection.find({ _id: ObjectId(_id) });
            const products = await cursor.toArray();
            res.send(products);
        })

        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            console.log(email);
            if (email !== undefined) {
                const query = { email: email };
                const cursor = ordersCollection.find(query);
                const products = await cursor.toArray();
                res.send(products);
            }
            else {
                const query = {};
                const cursor = ordersCollection.find(query);
                const products = await cursor.toArray();
                res.send(products);
            }
        })

        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.put('/user/removeAdmin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: '' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.put('/products/:id', verifyJWT, async (req, res) => {
            const _id = req.params.id;
            const updatedProduct = req.body;
            console.log(updatedProduct, _id);
            const filter = { "_id": ObjectId(_id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedProduct.name,
                    description: updatedProduct.description,
                    price: updatedProduct.price,
                    quantity: updatedProduct.quantity,
                    minQuantity: updatedProduct.minQuantity,
                    productCode: updatedProduct.productCode,
                    img: updatedProduct.img,
                }
            };
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.put('/orders', verifyJWT, async (req, res) => {
            const id = req.query.id;
            const product = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            console.log(product);
            const updatedDoc = {
                $set: {
                    userName: product.userName,
                    phone: product.phone,
                    adress: product.adress,
                    name: product.name,
                    email: product.email,
                    description: product.description,
                    price: product.price,
                    totalPrice: product.totalPrice,
                    quantity: product.quantity,
                    productCode: product.productCode,
                    img: product.img,
                    status: product.status,
                    transactionId: product?.transactionId,
                    paid: product?.paid
                }
            }
            const result = await ordersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.put('/users', async (req, res) => {
            const _id = req.query.id;
            const updatedUser = req.body;
            console.log(_id, updatedUser);
            const filter = { "_id": ObjectId(_id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updatedUser.name,
                    phone: updatedUser.phone,
                    adress: updatedUser.adress,
                    email: updatedUser.email,
                    img: updatedUser.img,
                    role: updatedUser.role
                }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        app.put("/users/:email", async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = req.body;
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign(
                { email: email },
                process.env.SECRET_ACCESS_TOKEN,
                { expiresIn: "24h" }
            );
            res.send({ result, token });
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const query = { name: user?.name, email: user?.email, adress: user?.adress, phone: user?.phone, password: user?.password };
            const exists = await usersCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, user: exists })
            }
            const result = await usersCollection.insertOne(user);
            res.send({ success: true, result });
        })

        app.post('/products', async (req, res) => {
            const productCode = req.query.productCode;
            const query = { productCode: productCode }
            const exists = await productsCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, product: exists })
            }
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send({ success: true, result });
        })

        app.post('/orders', async (req, res) => {
            const product = req.body;
            const result = await ordersCollection.insertOne(product);
            res.send(result);
        })

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        })

        app.post("/create-payment-intent", async (req, res) => {
            const service = req.body;
            const totalPrice = service.totalPrice;
            const amount = totalPrice * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });

        app.delete('/products', async (req, res) => {
            const _id = req.query.id;
            console.log(_id);
            const result = await productsCollection.deleteOne({ "_id": ObjectId(_id) });
            res.send(result);
        })

        app.delete('/orders', async (req, res) => {
            const _id = req.query.id;
            // console.log(id);
            const result = await ordersCollection.deleteOne({ "_id": ObjectId(_id) });
            res.send(result);
        })

        app.delete('/reviews', async (req, res) => {
            const _id = req.query.id;
            console.log(_id);
            const result = await reviewsCollection.deleteOne({ "_id": ObjectId(_id) });
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server connected')
})

app.listen(port, () => {
    console.log(`${process.env.name} listening on port ${port}`)
})