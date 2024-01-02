
module.export = async function checkTagExists(stationTag, dynamoDB) {
    const params = {
        TableName: 'StationInfo', // Replace with your table name
        Key: {
            'station_tag': stationTag
        }
    };

    try {
        const data = await dynamoDB.get(params).promise();
        return !!data.Item; // Returns true if the station_tag exists, false if not
    } catch (error) {
        console.error('Error checking station_tag in DynamoDB', error);
        return false; // Return false in case of an error
    }
}

