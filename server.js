const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

mongoose.connect('mongodb+srv://pushpankarsingh1106:pushpa123@cluster0.wcvfptt.mongodb.net/parkingDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const parkingLotSchema = new mongoose.Schema({
  capacity: {
    type: Number,
    min: 0,
    max: 2000
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);

const parkingSchema = new mongoose.Schema({
  parkingLotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingLot'
  },
  registrationNumber: {
    type: String,
    match: /^[A-Z0-9]{9}$/
  },
  color: {
    type: String,
    enum: ['RED', 'GREEN', 'BLUE', 'BLACK', 'WHITE', 'YELLOW', 'ORANGE']
  },
  slotNumber: {
    type: Number
  },
  status: {
    type: String,
    enum: ['PARKED', 'LEFT']
  }
});

const Parking = mongoose.model('Parking', parkingSchema);

app.post('/api/ParkingLots', async (req, res) => {
  try {
    const { id, capacity } = req.body;

    if (capacity >= 0 && capacity <= 2000) {
      const parkingLot = new ParkingLot({ _id: id, capacity });
      await parkingLot.save();

      res.json({ isSuccess: true, response: { id: parkingLot._id, capacity, isActive: parkingLot.isActive } });
    } else {
      res.status(400).json({ isSuccess: false, error: { reason: 'Invalid capacity' } });
    }
  } catch (error) {
    res.status(500).json({ isSuccess: false, error: { reason: error.message } });
  }
});

let nextAvailableSlot = 1;

app.post('/api/Parkings', async (req, res) => {
  try {
    const { parkingLotId, registrationNumber, color } = req.body;
    const parkingLot = await ParkingLot.findById(parkingLotId);
    
    if (!parkingLot || !parkingLot.isActive) {
      res.status(400).json({ isSuccess: false, error: { reason: 'Invalid or inactive parkingLotId' } });
      return;
    }

    // Use the next available slot
    const slotNumber = nextAvailableSlot;

    const parking = new Parking({ parkingLotId, registrationNumber, color, slotNumber, status: 'PARKED' });
    await parking.save();

    // Increment the next available slot for the next entry
    nextAvailableSlot++;

    res.json({ isSuccess: true, response: { slotNumber: parking.slotNumber,status: parking.status } });
  } catch (error) {
    res.status(500).json({ isSuccess: false, error: { reason: error.message } });
  }
});


// Third API: Leave / Unpark a car
app.delete('/api/Parkings', async (req, res) => {
  try {
    const { parkingLotId, registrationNumber } = req.body;
    const parkingLot = await ParkingLot.findById(parkingLotId);
    
    if (!parkingLot || !parkingLot.isActive) {
      res.status(400).json({ isSuccess: false, error: { reason: 'Invalid or inactive parkingLotId' } });
      return;
    }

    const parking = await Parking.findOneAndUpdate(
      { parkingLotId, registrationNumber, status: 'PARKED' },
      { $set: { status: 'LEFT' } },
      { new: true }
    );

    if (!parking) {
      res.status(400).json({ isSuccess: false, error: { reason: 'Car not found or already left' } });
      return;
    }

    // Construct the response object with the required sequence
    const response = {
      slotNumber: parking.slotNumber,
      registrationNumber: parking.registrationNumber,
      status: parking.status
    };

    res.json({ isSuccess: true, response });
  } catch (error) {
    res.status(500).json({ isSuccess: false, error: { reason: error.message } });
  }
});


// Fourth API: Registration number of cars with <colour>
app.get('/api/Parkings', async (req, res) => {
  try {
    const { color, parkingLotId } = req.query;
    const parkingLot = await ParkingLot.findById(parkingLotId);
    
    if (!parkingLot || !parkingLot.isActive) {
      res.status(400).json({ isSuccess: false, error: { reason: `No car found with color ${color}` } });
      return;
    }

    const registrations = await Parking.find(
      { color, parkingLotId, status: 'LEFT' },
      'color registrationNumber -_id'
    );

    // Construct the response object with the required sequence
    const response = {
      registrations: registrations.map(({ color, registrationNumber }) => ({ color, registrationNumber }))
    };
    if(registrations.length==0){
      res.json({

        "isSuccess": false,
        "error": {
        
        "reason": `No car found with color ${color}`
        
        }
        
        })
    }

    res.json({ isSuccess: true, response });
  } catch (error) {
    res.status(500).json({ isSuccess: false, error: { reason: error.message } });
  }
});

app.get('/api/Slots', async (req, res) => {
  try {
    const { color, parkingLotId } = req.query;
    const parkingLot = await ParkingLot.findById(parkingLotId);
    if (!parkingLot || !parkingLot.isActive) {
      res.status(400).json({ isSuccess: false, error: { reason: 'Invalid or inactive parkingLotId' } });
      return;
    }

    let slots = await Parking.find({ color, parkingLotId, status: 'LEFT' }, 'slotNumber -_id')
      .sort({ slotNumber: 1 });
    let val = [];
    slots = slots.map((item)=>{
       let slot = item.slotNumber;
       item = {"color": `${color}`,
         "slotNumber": slot              
      }
      val.push(item);
    })
    

    if (slots.length === 0) {
      res.status(400).json({

        "isSuccess": false,
        "error": {
        
        "reason": "Invalid Color"
        
        }
        
        });
      return;
    }

    res.json({ isSuccess: true, response: { val } });
  } catch (error) {
    res.status(500).json({ isSuccess: false, error: { reason: error.message } });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

