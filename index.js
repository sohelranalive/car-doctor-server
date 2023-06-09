const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express()
const port = process.env.PORT || 5000

//middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3krokas.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    //for data loading without pool request
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
});

const verifyJWT = (req, res, next) => {
    // console.log('Hitting Inside VerifyJWT');
    // console.log(req.headers.authorization)
    const authorization = req.headers.authorization
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decode;
        next()
    })
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)

        // await client.connect();

        //added for mongodb data loaded
        client.connect((error) => {
            if (error) {
                console.log(error)
                return;
            }
        });

        const servicesCollection = client.db('carDoctorDB').collection('services')
        const bookingsCollection = client.db('carDoctorDB').collection('bookings')


        //jwt
        app.post('/jwt', (req, res) => {
            const user = req.body
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            console.log(token);
            res.send({ token })
        })


        //services route
        app.get('/services', async (req, res) => {
            const sort = req.query.sort;
            const search = req.query.searchText;
            // console.log(search, sort);


            // const filter = {}
            // const filter = { price: { $lt: 100 } };
            const filter = { title: { $regex: search, $options: 'i' } }


            const options = {
                sort: { "price": sort == 'asc' ? 1 : -1 }
            }
            const cursor = servicesCollection.find(filter, options)
            //console.log(cursor);
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            // const options = {
            //     projection: { title: 1, price: 1 }
            // }
            const result = await servicesCollection.findOne(query)
            res.send(result)
        })

        //bookings route
        app.post('/bookings', async (req, res) => {
            const data = req.body;
            const result = await bookingsCollection.insertOne(data)
            res.send(result)
        })

        app.get('/bookings', verifyJWT, async (req, res) => {
            // console.log(req.headers);
            // console.log(req.headers.authorization);
            const decoded = req.decoded
            console.log('Returns after verify', decoded);

            if (decoded.email !== req.query.email) {
                return res.status(403).send({ error: true, message: 'Forbidden access' })
            }

            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingsCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const result = await bookingsCollection.deleteOne(filter)
            res.send(result)
        })

        app.patch('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const bookingInfo = req.body;
            const filter = { _id: new ObjectId(id) }
            const updatedBooking = {
                $set: {
                    status: bookingInfo.status
                }
            }
            const result = await bookingsCollection.updateOne(filter, updatedBooking);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Car Doctor Server is Running')
})

app.listen(port, () => {
    console.log(`Car Doctor Server is running on port: ${port}`);
})