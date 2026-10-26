import RasterBodyDefinition from '../../types/RasterBodyDefinition';

const rasterBody:RasterBodyDefinition = {
  parts:{
    torso:{ imageUrl:'/assets/bodies/torso.png', width:80, height:100, pivotPoint:[40, 100] },
    head:{ imageUrl:'/assets/bodies/head.png', width:40, height:60, pivotPoint:[20, 50] },
    farArm:{ imageUrl:'/assets/bodies/farArm.png', width:15, height:90, pivotPoint:[7, 10] },
    nearArm:{ imageUrl:'/assets/bodies/nearArm.png', width:15, height:90, pivotPoint:[7, 10] },
    leftLeg:{ imageUrl:'/assets/bodies/leftLeg.png', width:20, height:80, pivotPoint:[10, 0] },
    rightLeg:{ imageUrl:'/assets/bodies/rightLeg.png', width:20, height:80, pivotPoint:[10, 0] }
  },
  connections:{ head:[40, 0], farArm:[0, 20], nearArm:[80, 20], leftLeg:[20, 100], rightLeg:[60, 100] }
};

export default rasterBody;