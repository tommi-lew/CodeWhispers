// Generated by CoffeeScript 1.10.0
import swapper from "../swapper/swapper"
import randomiser from "../swapper/listRandomiser"
import connection from './connection'
import round from './round'

let io = null;

exports.initIo = function(_io) {
  io = _io;
};

exports.list = function(req, res) {
  getBranches()
  .then((branches) =>
    res.render('branches', {
      title: "Code Whispers",
      branches: branches
    })
  )
  .catch((error) =>
    res.status(500).json(error)
  );
};

exports.getDetails = function(req, res) {
  Promise.all([round.getRound(), getBranches()])
  .then(([round, branches]) =>
    res.send({
      round: round,
      branches: branches
    })
  )
  .catch((error) => res.status(500).json(error));
};

let getBranches = function() {
  let branchesCollection = connection.collection('branches');
  return branchesCollection.find().toArray();
};

exports.rescan = function() {
  return swapper.getBranchList((branches) =>
    ensureExists(branches)
    .then(() => cleanBranches(branches))
  );
};

let ensureExists = function(branches) {
  if (branches.length === 0) return Promise.resolve();

  let branchesCollection = connection.collection('branches');
  return branchesCollection.findOne({
    name: branches[0]
  })
  .then((doc) => {
    if (!doc) {
      branchesCollection.save({
        name: branches[0]
      }, {
        safe: true
      });
    }
  })
  .then(() => ensureExists(branches.slice(1)));
};

let cleanBranches = function(rawBranches) {
  let branchesCollection = connection.collection('branches');
  return branchesCollection.remove({
    name: {
      $nin: rawBranches
    }
  }, {
    safe: true
  });
};

exports.add = function(req, res) {
  let name = req.params['team'];
  if (name === "master") {
    res.status(200).send();
    return;
  }
  ensureExists([name])
  .then(() => {
    io.emit('new team', name);
    res.status(200).send();
  })
  .catch((error) => res.status(500).json(error));
};

exports.remove = function(req, res) {
  let name = req.params['team'];
  let branchesCollection = connection.collection('branches');
  branchesCollection.remove({
    name: name
  }, {
    safe: true
  })
  .then((doc) => {
    io.emit('remove team', name);
    res.send(200);
  })
  .catch((error) => res.status(500).json(error));
};

exports.swap = function(req, res) {
  performSwap((branchMapping) =>
    res.render('branchMapping', {
      title: "Code Whispers",
      branchMapping: branchMapping
    })
  );
};

let performSwap = function(callback) {
  getBranches()
  .then((branches) => {
    let sourceBranches = branches.map((item) => item.name);
    let targetBranches = randomiser.randomise(sourceBranches);
    swapper.swapBranches(sourceBranches, targetBranches, () => {
      let branchMapping = entangle(sourceBranches, targetBranches);
      callback(branchMapping);
    });
  });
};

exports.performSwap = performSwap;

let entangle = function(origin, destination) {
  return origin.map((o, i) => ({origin: o, destination: destination[i]}));
};
exports.entangle = entangle;
